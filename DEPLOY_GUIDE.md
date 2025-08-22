# Deployment Guide for GitHub Pages

This guide will walk you through the steps to deploy this application to GitHub Pages.

## Prerequisites

1.  **A GitHub Account:** You need a GitHub account. If you don't have one, you can sign up for free at [github.com](https://github.com).
2.  **`git` installed:** You need to have `git` installed on your local machine.
3.  **`npm` installed:** You need to have `npm` (which comes with Node.js) installed on your local machine.

## Step 1: Configure Your Repository Details

Before you can deploy, you need to tell the application where it will be hosted.

1.  **Open `package.json`:**
    *   Find the `"homepage"` line.
    *   Replace `YOUR_USERNAME` with your GitHub username.
    *   Replace `YOUR_REPONAME` with the name of the GitHub repository you will create for this project.
    *   It should look like this: `"homepage": "https://my-github-username.github.io/my-cool-app"`

2.  **Open `vite.config.ts`:**
    *   Find the `base` line.
    *   Replace `YOUR_REPONAME` with the name of your GitHub repository.
    *   It should look like this: `base: '/my-cool-app/'`

## Step 2: Set Up Your GitHub Repository

1.  **Create a New Repository:** Go to GitHub and create a new, empty repository. Give it the same name you used for `YOUR_REPONAME` in the previous step.
2.  **Push Your Code:** Follow the instructions on GitHub to push your local project code to the new repository. The commands will look something like this:
    ```bash
    # This initializes a new git repository locally (if you haven't already)
    git init
    # Add all your files to be tracked by git
    git add .
    # Create your first commit
    git commit -m "Initial commit"
    # Add the remote repository URL (copy this from your GitHub repo page)
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPONAME.git
    # Push your code to the main branch on GitHub
    git push -u origin main
    ```

## Step 3: Deploy the Application

Now that your code is on GitHub and configured, you can deploy it.

1.  **Open your terminal** in the project directory.
2.  **Run the deploy script:**
    ```bash
    npm run deploy
    ```
    This command will first build your application for production and then push the contents of the `dist` folder to a special branch named `gh-pages` in your GitHub repository.

## Step 4: Configure GitHub Pages Settings

The final step is to tell GitHub to use the `gh-pages` branch to serve your website.

1.  **Go to your repository on GitHub.**
2.  Click on the **"Settings"** tab.
3.  In the left sidebar, click on **"Pages"**.
4.  Under "Build and deployment", in the "Source" section, select **"Deploy from a branch"**.
5.  In the "Branch" section that appears, select the **`gh-pages`** branch and keep the folder as `/ (root)`.
6.  Click **"Save"**.

## Step 5: You're Live!

After a few minutes, your application should be live at the URL you specified in the `homepage` property of your `package.json` file.

You can visit that URL to see your deployed application. The first time you visit, it will ask for your Gemini API key, which will be saved in your browser's local storage for future visits.
