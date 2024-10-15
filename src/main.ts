import * as core from '@actions/core'
import * as github from '@actions/github'
import { readFileSync } from 'fs'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const prNumber = github.context.payload.pull_request?.number
    if (!prNumber) {
      return
    }
    const reviewer = readFileSync('REVIEWERS', 'utf8').trim()
    if (!reviewer) {
      core.setFailed('No reviewer found in REVIEWERS file')
      return
    }

    const githubToken = core.getInput('github-token')
    // TODO: Check if GitHub token is actually needed. It is not used in https://github.com/octokit/request-action/blob/main/index.js
    const octokit = github.getOctokit(githubToken)
    const reviews = await octokit.rest.pulls.listReviews({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: prNumber
    })
    let approved = false
    core.info(`Found ${reviews.data.length} reviews`)
    reviews.data.forEach(review => {
      core.info(`Review: ${review.user?.login} ${review.state} ${review.submitted_at}`)
      if (review.user?.login === reviewer && review.state === 'APPROVED') {
        core.info(`Reviewer ${reviewer} has approved the PR at ${review.submitted_at}`)
        approved = true
      }
    })
    if (!approved) {
      core.setFailed(`Reviewer ${reviewer} needs to approve the PR`)
      return
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
