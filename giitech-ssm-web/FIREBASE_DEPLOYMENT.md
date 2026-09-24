# Firebase Deployment

The app includes explicit Firestore rules, Storage rules, Firestore indexes, and
Cloud Functions. None are published automatically by the frontend build.

## Workflow Escalation Automation

The `functions` workspace publishes:

- `scheduledWorkflowEscalationSync`: refreshes workflow alerts every six hours
  from `europe-west1`, a Cloud Scheduler-supported region.
- `syncWorkflowEscalations`: allows authenticated administrators to run the
  same server-side refresh from the operational dashboard.

Install and build the functions before deployment:

```powershell
cd functions
npm install
npm run build
cd ..
```

Scheduled Cloud Functions require a Firebase project with billing enabled.

For local backend iteration:

```powershell
firebase emulators:start --only functions,firestore --project giitech-ssm
```

On Windows, set IPv4-first localhost resolution before Functions validation or
deployment if Firebase export discovery times out:

```powershell
$env:NODE_OPTIONS="--dns-result-order=ipv4first"
$env:FUNCTIONS_DISCOVERY_TIMEOUT="30"
```

The longer discovery window is needed on slower Windows environments while the
Firebase CLI loads the exported Functions trigger definitions.

## One-Time Storage Setup

Firebase Storage has not yet been initialized for the `giitech-ssm` project.
Open the Firebase console, select **Storage**, click **Get Started**, and create
the default bucket before validating or deploying `storage.rules`.

## Validate

```powershell
firebase deploy --only firestore:rules,firestore:indexes --dry-run --project giitech-ssm
firebase deploy --only storage --dry-run --project giitech-ssm
firebase deploy --only functions --dry-run --project giitech-ssm
```

## Publish

After validation and role-based smoke tests:

```powershell
firebase deploy --only firestore:rules,firestore:indexes,storage,functions --project giitech-ssm
```

After the first Functions deployment, keep recent rollback images without
allowing Artifact Registry storage to grow indefinitely:

```powershell
firebase functions:artifacts:setpolicy --location europe-west1 --days 7 --force --project giitech-ssm
firebase functions:artifacts:setpolicy --location africa-south1 --days 7 --force --project giitech-ssm
```

The rules default to deny for unknown Firestore collections and Storage paths.
Add an explicit rule whenever a new backend collection or upload path is added.

## AI Assessment Provider Configuration

AI assessment suggestions are generated server-side by the
`generateAiAssessmentSuggestion` callable. The OpenAI key is never placed in
the Vite web environment or sent to the browser. Configure the Functions
runtime before enabling the teacher AI review screen:

The function declares both values through Firebase Functions Parameters:
`OPENAI_API_KEY` is a Secret Manager secret and `OPENAI_ASSESSMENT_MODEL` is a
deploy-time string parameter with a `gpt-4.1-mini` default. Complete the
Firebase deployment prompts, then redeploy Functions. Do not commit either
value to `.env`, source control, or the frontend bundle.

The callable intentionally stores suggestions as `pending`; a teacher must
approve the result before a submission becomes graded. Administrators can
review generation and decision metadata at `/admin/ai-audit`.
