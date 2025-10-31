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
  const [elections] = await pool.query(
    'SELECT id, start_time, end_time, status FROM elections WHERE status != "closed"'
  );

  const now = new Date();
  elections.forEach(async (election) => {
    if (new Date(election.start_time) <= now && election.status === 'pending') {
      await startElection(election.id);
    }
    if (new Date(election.end_time) <= now && election.status === 'active') {
      await endElection(election.id);
    }
  });
});
