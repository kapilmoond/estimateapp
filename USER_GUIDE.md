# HSR Construction Estimator - User Guide

Welcome to the HSR Construction Estimator! This guide will walk you through all the features of the application to help you generate detailed project estimates.

## Getting Started

### 1. API Key Setup

The first time you open the application, you will see a banner asking for your Gemini API Key. This key is required for the AI-powered features of the app.

1.  Paste your Gemini API Key into the input field.
2.  Click the **"Save"** button.

Your key will be saved securely in your browser's local storage, so you won't have to enter it again on the same device.

### 2. Text-to-Speech (Optional)

You can have the AI's chat responses read aloud.

-   **Enable/Disable:** Check the **"Read AI Responses Aloud"** box at the top of the page to turn this feature on or off.
-   **Voice and Speed:** When enabled, dropdown and slider controls will appear, allowing you to select your preferred voice and adjust the speech speed.

## Step-by-Step Workflow

The application guides you through a step-by-step process to generate a construction estimate.

### Step 1: Define Project Scope

This is where you define the work you want to estimate.

1.  **Reference Documents (Optional):** You can upload reference documents (`.pdf`, `.txt`, `.docx`, `.xlsx`) that contain details about your project. The AI will use the content of these files to inform its responses. Click **"Upload Files"** to select files from your computer.
2.  **Chat with the AI:** Use the chat box at the bottom to describe your project to the AI assistant. Be as detailed as possible. The AI will ask clarifying questions to help you build a complete scope. You can also use the microphone icon to provide input via voice.
3.  **Finalize Scope:** Once you are satisfied that the conversation has captured the full scope of your project, click the **"Finalize Scope & Generate Keywords"** button to proceed to the next step.

### Step 2: Approve Keywords

In this step, the AI extracts relevant search keywords from the project scope you defined.

1.  **Review Keywords:** A list of keywords will be displayed. These keywords will be used to find matching items in the Haryana Schedule of Rates (HSR) database.
2.  **Regenerate Keywords (Optional):** If you are not satisfied with the keywords, you can provide feedback in the text box and click **"Regenerate Keywords"**. The AI will generate a new set of keywords based on your feedback. You can repeat this process until you are happy with the keywords.
3.  **Find HSR Items:** Once you are satisfied with the keywords, click the **"Find HSR Items"** button.

### Step 3: Approve HSR Items

The application now displays the HSR items that were found using your keywords.

1.  **Review Found Items:** Look through the list of HSR items.
2.  **Approve and Generate:** If the list looks complete, click **"Approve & Generate Estimate"** to proceed directly to the final report.
3.  **Refine Search (Optional):** If you think items are missing or incorrect, you can provide feedback in the text box at the bottom (e.g., "Find items related to steel reinforcement") and click **"Refine Search & Generate Estimate"**. This will trigger a refined search.

### Step 3b: Approve Refined HSR Items (If Applicable)

This step only appears if the refined search in the previous step found new items.

1.  **Review New Items:** The screen will show you the "Original Items" and the "Newly Found Items" separately.
2.  **Provide Final Instructions (Optional):** You can provide some final instructions for the report generation in the text box.
3.  **Approve All Items:** Click the **"Approve & Generate Estimate with All Items"** button to proceed to the final report with the combined list of items.
4.  **Go Back:** You can click **"Back to Original Items"** to return to the previous screen.

### Step 4: Review & Edit Report

The AI will now generate a detailed project estimate in plain text.

1.  **Review the Report:** Read through the generated report.
2.  **Edit the Report (Optional):** If you need any changes, type your instructions into the "Edit Instructions" text box (e.g., "Make the headings bold", "Combine the first two tables") and click **"Regenerate Report"**.
3.  **Further Refine Search (Optional):** You can still trigger another refined search from this screen by clicking **"Refine Search & Regenerate"**.
4.  **Go Back:** Click **"Back to HSR Items"** to return to the HSR item approval step.
5.  **Finalize:** Once you are happy with the report, click **"Finalize Report"**.

### Step 5: Done

The finalized report is displayed. You can now:
-   **Print Report:** Click this button to open your browser's print dialog.
-   **Start New Estimate:** Click this to reset the application and start a new project.
