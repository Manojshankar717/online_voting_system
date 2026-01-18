import cron from 'node-cron';
import { pool } from './db.js';

// Function to start elections
async function startElection(electionId) {
  await pool.query('UPDATE elections SET status = ? WHERE id = ?', ['active', electionId]);
  console.log(`Election ${electionId} started.`);
}

// Function to end elections
async function endElection(electionId) {
  await pool.query('UPDATE elections SET status = ? WHERE id = ?', ['closed', electionId]);
  console.log(`Election ${electionId} ended.`);
}

// Schedule a job (example: every day at midnight check elections)
cron.schedule('0 0 * * *', async () => {
  try {
    const [elections] = await pool.query(
      'SELECT id, starts_at, ends_at, status FROM elections WHERE status != "completed"'
    );

    const now = new Date();
    for (const election of elections) {
      if (new Date(election.starts_at) <= now && election.status === 'pending') {
        await startElection(election.id);
      }
      if (new Date(election.ends_at) <= now && election.status === 'active') {
        await endElection(election.id);
      }
    }
  } catch (error) {
    console.error('Error in scheduled election check:', error);
  }
});
