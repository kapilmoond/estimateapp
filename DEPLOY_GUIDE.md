# Deployment Guide for GitHub Pages

This guide will walk you through the final steps to deploy this application to GitHub Pages. The necessary code changes have already been made.

## Prerequisites

1.  **`npm` installed:** You need to have `npm` (which comes with Node.js) installed on your local machine or in your development environment.
2.  **Code Pushed to GitHub:** Ensure that the latest code from this branch is pushed to your `kapilmoond/estimateapp` repository on GitHub.

## Step 1: Deploy the Application

1.  **Open your terminal** in the project directory.
2.  **Run the deploy script:**
    ```bash
    npm run deploy
    ```
    This command will do two things:
    a.  It will run `npm run build` to create a production-ready version of your application in the `dist` folder.
    b.  It will then push the contents of that `dist` folder to a special branch named `gh-pages` in your GitHub repository.

## Step 2: Configure GitHub Pages Settings

The final step is to tell GitHub to use the `gh-pages` branch to serve your website.

1.  **Go to your repository on GitHub:** [https://github.com/kapilmoond/estimateapp](https://github.com/kapilmoond/estimateapp)
2.  Click on the **"Settings"** tab.
3.  In the left sidebar, click on **"Pages"**.
4.  Under "Build and deployment", in the "Source" section, select **"Deploy from a branch"**.
5.  In the "Branch" section that appears, select the **`gh-pages`** branch and keep the folder as `/ (root)`.
6.  Click **"Save"**.

## Step 3: You're Live!

After a few minutes, your application should be live at the following URL:
**[https://kapilmoond.github.io/estimateapp/](https://kapilmoond.github.io/estimateapp/)**

The first time you visit, it will ask for your Gemini API key, which will be saved in your browser's local storage for future visits.
