import { DEMO_MODE, pool } from '../utils/db.js';
import { writeAudit } from '../utils/audit.js';

// List all active elections
export async function listElectionsController(req, res) {
  if (DEMO_MODE) {
    // Using demo data store
    const { demoElections, demoCandidates } = await import('../utils/demoStore.js');
    
    const activeElections = demoElections.filter(e => 
      new Date(e.starts_at) <= new Date() && 
      new Date(e.ends_at) >= new Date() &&
      e.status !== 'completed'
    );

    const electionsWithCandidates = activeElections.map(election => ({
      ...election,
      candidates: demoCandidates
        .filter(candidate => candidate.election_id === election.id)
        .map(candidate => ({
          id: candidate.id,
          name: candidate.name,
          party: candidate.party || 'Independent',
          manifesto: candidate.manifesto || ''
        }))
    }));

    return res.json(electionsWithCandidates);
  }

  // Production database path
  try {
    const [elections] = await pool.query(`
      SELECT e.id, e.title, e.description, e.type, e.max_selections, 
             e.starts_at, e.ends_at, e.status, e.created_at
      FROM elections e
      WHERE e.starts_at <= NOW() AND e.ends_at >= NOW() AND e.status = 'active'
      ORDER BY e.created_at DESC
    `);

    const electionsWithCandidates = await Promise.all(
      elections.map(async (election) => {
        const [candidates] = await pool.query(
          'SELECT id, name, party, manifesto FROM candidates WHERE election_id = ? ORDER BY name',
          [election.id]
        );
        
        return {
          ...election,
          candidates: candidates
        };
      })
    );

    res.json(electionsWithCandidates);
  } catch (error) {
    console.error('Error fetching elections:', error);
    res.status(500).json({ message: 'Failed to fetch elections' });
  }
}

// Get specific election details
export async function getElectionController(req, res) {
  const { id } = req.params;

  if (DEMO_MODE) {
    // Using demo data store
    const { demoElections, demoCandidates } = await import('../utils/demoStore.js');
    
    const election = demoElections.find(e => e.id === Number(id));
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Check if election is active
    if (!(new Date(election.starts_at) <= new Date() && 
          new Date(election.ends_at) >= new Date() &&
          election.status !== 'completed')) {
      return res.status(400).json({ message: 'Election is not active' });
    }

    const candidates = demoCandidates
      .filter(candidate => candidate.election_id === Number(id))
      .map(candidate => ({
        id: candidate.id,
        name: candidate.name,
        party: candidate.party || 'Independent',
        manifesto: candidate.manifesto || ''
      }));

    return res.json({
      ...election,
      candidates
    });
  }

  // Production database path
  try {
    const [elections] = await pool.query(`
      SELECT e.id, e.title, e.description, e.type, e.max_selections, 
             e.starts_at, e.ends_at, e.status, e.created_at
      FROM elections e
      WHERE e.id = ? AND e.starts_at <= NOW() AND e.ends_at >= NOW() AND e.status = 'active'
    `, [id]);

    if (elections.length === 0) {
      return res.status(404).json({ message: 'Election not found or not active' });
    }

    const [candidates] = await pool.query(
      'SELECT id, name, party, manifesto FROM candidates WHERE election_id = ? ORDER BY name',
      [id]
    );

    res.json({
      ...elections[0],
      candidates
    });
  } catch (error) {
    console.error('Error fetching election:', error);
    res.status(500).json({ message: 'Failed to fetch election' });
  }
}

// Cast a vote in an election
export async function castVoteController(req, res) {
  const { id } = req.params;  // election id
  const userId = req.user.sub; // from auth middleware
  const { candidate_ids } = req.body || {};

  if (!candidate_ids || !Array.isArray(candidate_ids) || candidate_ids.length === 0) {
    return res.status(400).json({ message: 'Missing or invalid candidate_ids' });
  }

  if (DEMO_MODE) {
    // Using demo data store
    const { demoElections, demoCandidates, demoVotes, demoUsers } = await import('../utils/demoStore.js');
    
    const election = demoElections.find(e => e.id === Number(id));
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Check if election is active
    if (!(new Date(election.starts_at) <= new Date() && 
          new Date(election.ends_at) >= new Date() &&
          election.status !== 'completed')) {
      return res.status(400).json({ message: 'Election is not active' });
    }

    // Verify user exists
    const user = demoUsers.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has already voted in this election
    if (demoVotes.some(vote => vote.user_id === userId && vote.election_id === Number(id))) {
      return res.status(400).json({ message: 'User has already voted in this election' });
    }

    // Verify candidates belong to this election
    for (const candidateId of candidate_ids) {
      const candidate = demoCandidates.find(c => 
        c.id === Number(candidateId) && c.election_id === Number(id)
      );
      if (!candidate) {
        return res.status(400).json({ message: `Invalid candidate ID: ${candidateId}` });
      }
    }

    // Check max selections
    if (election.max_selections && candidate_ids.length > election.max_selections) {
      return res.status(400).json({ 
        message: `Maximum ${election.max_selections} selection(s) allowed` 
      });
    }

    // Record the votes
    for (const candidateId of candidate_ids) {
      const voteId = (demoVotes.at(-1)?.id || 0) + 1;
      demoVotes.push({
        id: voteId,
        election_id: Number(id),
        candidate_id: Number(candidateId),
        user_id: userId,
        created_at: new Date().toISOString()
      });
    }

    await writeAudit('vote.cast', { electionId: id, userId, candidateIds: candidate_ids });

    return res.status(201).json({ message: 'Vote recorded successfully' });
  }

  // Production database path
  try {
    // Check if election exists and is active
    const [elections] = await pool.query(`
      SELECT id, title, max_selections, starts_at, ends_at, status
      FROM elections 
      WHERE id = ? AND starts_at <= NOW() AND ends_at >= NOW() AND status = 'active'
    `, [id]);

    if (elections.length === 0) {
      return res.status(404).json({ message: 'Election not found or not active' });
    }

    const election = elections[0];

    // Check if user has already voted in this election
    const [existingVotes] = await pool.query(
      'SELECT id FROM votes WHERE user_id = ? AND election_id = ?',
      [userId, id]
    );

    if (existingVotes.length > 0) {
      return res.status(400).json({ message: 'User has already voted in this election' });
    }

    // Verify candidates belong to this election and get max_selections
    const [candidates] = await pool.query(
      'SELECT id FROM candidates WHERE id IN (' + candidate_ids.map(() => '?').join(',') + ') AND election_id = ?',
      [...candidate_ids, id]
    );

    if (candidates.length !== candidate_ids.length) {
      return res.status(400).json({ message: 'Some candidate IDs are invalid for this election' });
    }

    // Check max selections
    if (election.max_selections && candidate_ids.length > election.max_selections) {
      return res.status(400).json({ 
        message: `Maximum ${election.max_selections} selection(s) allowed` 
      });
    }

    // Begin transaction to record all votes
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert votes
      for (const candidateId of candidate_ids) {
        await connection.query(
          'INSERT INTO votes (election_id, candidate_id, user_id) VALUES (?, ?, ?)',
          [id, candidateId, userId]
        );
      }

      await connection.commit();
      await connection.release();

      await writeAudit('vote.cast', { electionId: id, userId, candidateIds: candidate_ids });

      res.status(201).json({ message: 'Vote recorded successfully' });
    } catch (error) {
      await connection.rollback();
      await connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error casting vote:', error);
    res.status(500).json({ message: 'Failed to record vote' });
  }
}