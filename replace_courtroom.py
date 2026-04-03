import re

with open("frontend/src/components/courtroom/CourtroomMain.tsx", "r") as f:
    content = f.read()

# Make imports
content = re.sub(
    r"import { ErrorBoundary } from \"@/components/ErrorBoundary\";",
    'import { ErrorBoundary } from "@/components/ErrorBoundary";\nimport { useTrialStore } from "@/store/trialStore";\nimport { TrialWebSocketClient } from "@/lib/ws";',
    content
)

# We will completely replace the whole component because there are too many changes.
