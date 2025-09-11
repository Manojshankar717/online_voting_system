import { DEMO_MODE, pool } from '../utils/db.js'
import { writeAudit } from '../utils/audit.js'
import { demoElections, demoCandidates, demoUsers, demoVotes, ELECTION_TYPES } from '../utils/demoStore.js'

export async function createElectionController(req, res) {
	const { title, description, type, max_selections, starts_at, ends_at } = req.body || {}
	if (!title || !type || !starts_at || !ends_at) {
		return res.status(400).json({ message: 'Missing required fields' })
	}
	
	// Validate election type
	if (!Object.values(ELECTION_TYPES).includes(type)) {
		return res.status(400).json({ message: 'Invalid election type' })
	}
	
	if (DEMO_MODE) {
		const id = (demoElections.at(-1)?.id || 0) + 1
		demoElections.push({ 
			id, 
			title, 
			description: description || '', 
			type,
			max_selections: max_selections || null,
			starts_at, 
			ends_at 
		})
		await writeAudit('election.create', { id, title, type })
		return res.status(201).json({ id })
	}
	
	const [result] = await pool.query(
		'INSERT INTO elections (title, description, type, max_selections, starts_at, ends_at, created_by) VALUES (?,?,?,?,?,?,?)',
		[title, description || '', type, max_selections || null, starts_at, ends_at, req.user.sub]
	)
	await writeAudit('election.create', { id: result.insertId, title, type })
	return res.status(201).json({ id: result.insertId })
}

export async function addCandidateController(req, res) {
	const { electionId } = req.params
	const { name, party, manifesto } = req.body || {}
	if (!name) return res.status(400).json({ message: 'Missing name' })
	if (DEMO_MODE) {
		const id = (demoCandidates.at(-1)?.id || 0) + 1
		demoCandidates.push({ 
			id, 
			election_id: Number(electionId), 
			name, 
			party: party || 'Independent',
			manifesto: manifesto || '' 
		})
		await writeAudit('candidate.add', { id, electionId, name, party })
		return res.status(201).json({ id })
	}
	const [result] = await pool.query(
		'INSERT INTO candidates (election_id, name, party, manifesto) VALUES (?,?,?,?)',
		[electionId, name, party || 'Independent', manifesto || '']
	)
	await writeAudit('candidate.add', { id: result.insertId, electionId, name, party })
	return res.status(201).json({ id: result.insertId })
}

export async function startElectionController(req, res) {
	const { electionId } = req.params
	if (DEMO_MODE) {
		const election = demoElections.find(e => e.id === Number(electionId))
		if (!election) return res.status(404).json({ message: 'Election not found' })
		election.status = 'active'
		await writeAudit('election.start', { id: electionId })
		return res.json({ message: 'Election started successfully' })
	}
	
	const [result] = await pool.query(
		'UPDATE elections SET status = ? WHERE id = ?',
		['active', electionId]
	)
	if (result.affectedRows === 0) {
		return res.status(404).json({ message: 'Election not found' })
	}
	await writeAudit('election.start', { id: electionId })
	return res.json({ message: 'Election started successfully' })
}

export async function stopElectionController(req, res) {
	const { electionId } = req.params
	if (DEMO_MODE) {
		const election = demoElections.find(e => e.id === Number(electionId))
		if (!election) return res.status(404).json({ message: 'Election not found' })
		election.status = 'completed'
		await writeAudit('election.stop', { id: electionId })
		return res.json({ message: 'Election stopped successfully' })
	}
	
	const [result] = await pool.query(
		'UPDATE elections SET status = ? WHERE id = ?',
		['completed', electionId]
	)
	if (result.affectedRows === 0) {
		return res.status(404).json({ message: 'Election not found' })
	}
	await writeAudit('election.stop', { id: electionId })
	return res.json({ message: 'Election stopped successfully' })
}

export async function getElectionsController(req, res) {
	if (DEMO_MODE) {
		const elections = demoElections.map(e => ({
			...e,
			candidates: demoCandidates.filter(c => c.election_id === e.id),
			voteCount: demoVotes.filter(v => v.election_id === e.id).length
		}))
		return res.json(elections)
	}
	
	const [elections] = await pool.query(`
		SELECT e.*, 
			COUNT(DISTINCT c.id) as candidate_count,
			COUNT(DISTINCT v.id) as vote_count
		FROM elections e
		LEFT JOIN candidates c ON c.election_id = e.id
		LEFT JOIN votes v ON v.election_id = e.id
		GROUP BY e.id
		ORDER BY e.created_at DESC
	`)
	res.json(elections)
}

// Simple in-memory cache for admin stats
let statsCache = { data: null, expiresAt: 0 }

export async function getAdminStatsController(_req, res) {
  const now = Date.now()
  if (statsCache.data && statsCache.expiresAt > now) {
    return res.json({ cached: true, ...statsCache.data })
  }

  if (DEMO_MODE) {
    // Aggregate stats from in-memory stores
    const usersCount = demoUsers.length
    const electionsCount = demoElections.length
    const candidatesCount = demoCandidates.length
    const votesCount = demoVotes.length

    const elections = demoElections.map((e) => {
      const evotes = demoVotes.filter((v) => v.election_id === e.id)
      const ecands = demoCandidates.filter((c) => c.election_id === e.id)
      const turnout = usersCount > 0 ? Number(((evotes.length / usersCount) * 100).toFixed(2)) : 0
      return {
        id: e.id,
        title: e.title,
        type: e.type || 'single_choice',
        candidates: ecands.length,
        votes: evotes.length,
        turnout,
      }
    })

    const recentVotes = demoVotes
      .slice(-20)
      .reverse()
      .map((v) => ({ id: v.id, election_id: v.election_id, candidate_id: v.candidate_id, user_id: v.user_id, created_at: v.created_at }))

    const payload = {
      usersCount,
      electionsCount,
      candidatesCount,
      votesCount,
      elections,
      recentVotes,
      generatedAt: new Date().toISOString(),
    }

    statsCache = { data: payload, expiresAt: now + 30_000 } // 30s TTL
    return res.json(payload)
  }

  // MySQL path (basic counts as placeholder)
  try {
    const [[{ usersCount }]] = await pool.query('SELECT COUNT(*) as usersCount FROM users')
    const [[{ electionsCount }]] = await pool.query('SELECT COUNT(*) as electionsCount FROM elections')
    const [[{ candidatesCount }]] = await pool.query('SELECT COUNT(*) as candidatesCount FROM candidates')
    const [[{ votesCount }]] = await pool.query('SELECT COUNT(*) as votesCount FROM votes')

    const [elections] = await pool.query(
      `SELECT e.id, e.title, e.type, 
              (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) as candidates,
              (SELECT COUNT(*) FROM votes v WHERE v.election_id = e.id) as votes
       FROM elections e
       ORDER BY e.starts_at DESC
       LIMIT 50`
    )

    const [recentVotes] = await pool.query(
      `SELECT id, election_id, candidate_id, user_id, created_at
       FROM votes
       ORDER BY created_at DESC
       LIMIT 20`
    )

    const payload = {
      usersCount,
      electionsCount,
      candidatesCount,
      votesCount,
      elections,
      recentVotes,
      generatedAt: new Date().toISOString(),
    }

    statsCache = { data: payload, expiresAt: now + 30_000 }
    return res.json(payload)
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load stats' })
  }
}


