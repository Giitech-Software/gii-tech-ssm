import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import type { DocumentPickerAsset } from "expo-document-picker";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { StudentPageShell } from "../../src/components/StudentPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSync } from "../../src/contexts/SyncContext";
import { fetchStudentAssignments, type StudentAssignment } from "../../src/services/studentDetailService";
import { validatePickedAttachment } from "../../src/services/attachmentUploadService";
import {
  clearSubmissionDraft,
  fetchStudentSubmissionContext,
  findCachedAssignment,
  readSubmissionDraft,
  saveSubmissionDraft,
  submissionDocumentId,
  type StudentAssessmentResponse,
} from "../../src/services/studentSubmissionService";

export default function StudentSubmissionPage() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId?: string }>();
  const { user, displayName } = useAuth();
  const { queueAttachmentUpload, queueWrite } = useSync();
  const [assignment, setAssignment] = useState<StudentAssignment | null>(null);
  const [responseText, setResponseText] = useState("");
  const [questionResponses, setQuestionResponses] = useState<Record<string, string>>({});
  const [attachment, setAttachment] = useState<DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user || !assignmentId) return;
    setLoading(true);
    setError("");
    try {
      const [assignments, draft] = await Promise.all([
        fetchStudentAssignments(user.uid),
        readSubmissionDraft(user.uid, assignmentId),
      ]);
      const selectedAssignment = findCachedAssignment(assignments.data, assignmentId);
      if (!selectedAssignment) throw new Error("This assignment could not be found.");
      setAssignment(selectedAssignment);
      setResponseText(draft?.responseText || "");
      setQuestionResponses(draft?.questionResponses || {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to open this assignment.");
    } finally {
      setLoading(false);
    }
  }, [assignmentId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user || !assignmentId || loading) return;
    const timeout = setTimeout(() => {
      void saveSubmissionDraft(user.uid, assignmentId, responseText, questionResponses);
    }, 400);
    return () => clearTimeout(timeout);
  }, [assignmentId, loading, questionResponses, responseText, user]);

  const submit = async () => {
    if (!user || !assignment || !assignmentId) return;
    const isAutoMarked = ["objective", "quiz", "short-answer"].includes(assignment.type);
    const requiresAttachment = ["file", "project"].includes(assignment.type);
    const assessmentResponses: StudentAssessmentResponse[] = isAutoMarked
      ? assignment.questions.map((question, index) => {
          const selected = questionResponses[String(index)] || "";
          return {
            question: question.question,
            selected,
            correct:
              selected.trim().toLowerCase() === question.answer.trim().toLowerCase() &&
              selected.trim() !== "",
          };
        })
      : [];

    if (isAutoMarked && (!assignment.questions.length || assessmentResponses.some((item) => !item.selected.trim()))) {
      setError("Answer every question before submitting.");
      return;
    }
    if (requiresAttachment && !attachment) {
      setError("Choose a file before submitting this assignment.");
      return;
    }
    if (!isAutoMarked && !requiresAttachment && !responseText.trim()) {
      setError("Enter your response before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const context = await fetchStudentSubmissionContext(user.uid);
      const submittedAt = new Date().toISOString();
      const score = assessmentResponses.length
        ? Math.round(
            (assessmentResponses.filter((response) => response.correct).length /
              assessmentResponses.length) *
              100
          )
        : null;
      const submissionData = {
        assignmentId,
        assignmentName: assignment.title,
        classId: context.classId || assignment.classId,
        studentId: context.studentId,
        studentUid: user.uid,
        studentName: context.studentName || displayName || "Student",
        ...(isAutoMarked
          ? { responses: assessmentResponses, score }
          : responseText.trim()
            ? { responseText: responseText.trim() }
            : {}),
        submittedAt,
        createdAt: submittedAt,
        status: "submitted",
      };
      const submissionPath = `submissions/${submissionDocumentId(user.uid, assignmentId)}`;
      const syncResult = attachment
        ? await queueAttachmentUpload({
            asset: attachment,
            assignmentId,
            studentId: context.studentId,
            submissionPath,
            submissionData,
          })
        : await queueWrite({
            path: submissionPath,
            type: "set",
            merge: true,
            data: submissionData,
          });
      await clearSubmissionDraft(user.uid, assignmentId);
      setAttachment(null);
      setMessage(
        syncResult === "synced"
          ? "Response submitted successfully."
          : "Response saved on this device and queued for sync."
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save your response.");
    } finally {
      setSubmitting(false);
    }
  };

  const pickAttachment = async () => {
    setError("");
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/*",
        "image/*",
      ],
    });
    if (!result.canceled) {
      try {
        validatePickedAttachment(result.assets[0]);
        setAttachment(result.assets[0]);
      } catch (pickError) {
        setAttachment(null);
        setError(pickError instanceof Error ? pickError.message : "Unable to use this file.");
      }
    }
  };

  return (
    <StudentPageShell
      subtitle="Your response is saved locally while you type and queued safely when you submit."
      title={assignment?.title || "Assignment response"}
    >
      {loading ? (
        <ActivityIndicator className="mt-8" size="large" color="#0369a1" />
      ) : (
        <>
          {!!assignment?.description && (
            <View className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
              <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Instructions
              </Text>
              <Text className="mt-3 text-sm leading-6 text-slate-700">{assignment.description}</Text>
            </View>
          )}
          {assignment && ["objective", "quiz", "short-answer"].includes(assignment.type) ? (
            <View className="mt-5">
              {assignment.questions.map((question, index) => (
                <View
                  className="mb-4 rounded-3xl border border-slate-200 bg-white p-5"
                  key={`${question.question}-${index}`}
                >
                  <Text className="text-base font-extrabold leading-6 text-slate-900">
                    {index + 1}. {question.question}
                  </Text>
                  {assignment.type === "short-answer" ? (
                    <TextInput
                      className="mt-4 min-h-28 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base leading-6 text-slate-900"
                      multiline
                      onChangeText={(value) =>
                        setQuestionResponses((current) => ({ ...current, [String(index)]: value }))
                      }
                      placeholder="Type your answer..."
                      placeholderTextColor="#94a3b8"
                      textAlignVertical="top"
                      value={questionResponses[String(index)] || ""}
                    />
                  ) : (
                    <View className="mt-4">
                      {question.options.map((option) => {
                        const selected = questionResponses[String(index)] === option;
                        return (
                          <Pressable
                            className={`mb-2 rounded-2xl border p-4 ${
                              selected
                                ? "border-sky-600 bg-sky-50"
                                : "border-slate-200 bg-slate-50"
                            }`}
                            key={option}
                            onPress={() =>
                              setQuestionResponses((current) => ({
                                ...current,
                                [String(index)]: option,
                              }))
                            }
                          >
                            <Text className={`text-sm ${selected ? "font-bold text-sky-800" : "text-slate-700"}`}>
                              {option}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))}
              <Text className="text-xs text-slate-500">
                Answers are saved on this device automatically and marked when submitted.
              </Text>
            </View>
          ) : (
            <View className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
              <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Your response
              </Text>
              <TextInput
                className="mt-3 min-h-52 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base leading-6 text-slate-900"
                multiline
                onChangeText={setResponseText}
                placeholder="Write your answer here..."
                placeholderTextColor="#94a3b8"
                textAlignVertical="top"
                value={responseText}
              />
              <Text className="mt-3 text-xs text-slate-500">
                Drafts are stored on this device automatically.
              </Text>
            </View>
          )}
          {assignment && ["file", "project", "essay"].includes(assignment.type) && (
            <View className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
              <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Attachment
              </Text>
              <Text className="mt-3 text-sm leading-5 text-slate-600">
                PDF, Word, text, or image files below 10 MB.
              </Text>
              {!!attachment && (
                <View className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <Text className="text-sm font-bold text-slate-900">{attachment.name}</Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    {attachment.mimeType || "Unknown file type"} |{" "}
                    {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : "Size unavailable"}
                  </Text>
                </View>
              )}
              <View className="mt-4 flex-row">
                <Pressable
                  className="mr-3 rounded-2xl bg-slate-900 px-4 py-3 active:bg-slate-700"
                  onPress={pickAttachment}
                >
                  <Text className="text-sm font-bold text-white">
                    {attachment ? "Replace file" : "Choose file"}
                  </Text>
                </Pressable>
                {!!attachment && (
                  <Pressable
                    className="rounded-2xl bg-red-50 px-4 py-3 active:bg-red-100"
                    onPress={() => setAttachment(null)}
                  >
                    <Text className="text-sm font-bold text-red-700">Remove</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
          {!!message && (
            <Text className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              {message}
            </Text>
          )}
          {!!error && (
            <Text className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </Text>
          )}
          <Pressable
            className="mt-5 items-center rounded-2xl bg-sky-700 px-4 py-4 active:bg-sky-800"
            disabled={submitting}
            onPress={submit}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-bold text-white">Submit response</Text>
            )}
          </Pressable>
        </>
      )}
    </StudentPageShell>
  );
}
