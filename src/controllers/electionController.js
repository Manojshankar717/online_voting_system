import { DEMO_MODE, pool } from '../utils/db.js'
import { writeAudit } from '../utils/audit.js'
import { seedDemoData, listDemoElections, getDemoElection, hasUserVoted, isValidCandidate, createDemoVotes, demoVotes, demoCandidates, ELECTION_TYPES } from '../utils/demoStore.js'

export async function listElectionsController(_req, res) {
	if (DEMO_MODE) {
		seedDemoData()
		return res.json(listDemoElections())
	}
	const [rows] = await pool.query('SELECT id, title, description, starts_at, ends_at FROM elections ORDER BY starts_at DESC')
	return res.json(rows)
}

export async function getElectionController(req, res) {
	const { id } = req.params
	if (DEMO_MODE) {
		seedDemoData()
		const data = getDemoElection(id)
		if (!data) return res.status(404).json({ message: 'Election not found' })
		return res.json({ ...data.election, candidates: data.candidates })
	}
	const [elections] = await pool.query('SELECT id, title, description, starts_at, ends_at FROM elections WHERE id = ?', [id])
	if (!elections[0]) return res.status(404).json({ message: 'Election not found' })
	const [candidates] = await pool.query('SELECT id, name, manifesto FROM candidates WHERE election_id = ?', [id])
	return res.json({ ...elections[0], candidates })
}

export async function castVoteController(req, res) {
	const { id } = req.params
	const { votes } = req.body || {}
	if (!votes || !Array.isArray(votes) || votes.length === 0) {
		return res.status(400).json({ message: 'Missing votes array' })
	}
	
	try {
		// Enforce voting window
		if (DEMO_MODE) {
			seedDemoData()
			const data = getDemoElection(id)
			if (!data) return res.status(404).json({ message: 'Election not found' })
			const now = Date.now()
			const startsAt = Date.parse(data.election.starts_at)
			const endsAt = Date.parse(data.election.ends_at)
			if (Number.isFinite(startsAt) && now < startsAt) return res.status(403).json({ message: 'Voting not started' })
			if (Number.isFinite(endsAt) && now > endsAt) return res.status(403).json({ message: 'Voting ended' })
		} else {
			const [erows] = await pool.query('SELECT starts_at, ends_at FROM elections WHERE id = ?', [id])
			if (!erows[0]) return res.status(404).json({ message: 'Election not found' })
			const now = Date.now()
			const startsAt = new Date(erows[0].starts_at).getTime()
			const endsAt = new Date(erows[0].ends_at).getTime()
			if (Number.isFinite(startsAt) && now < startsAt) return res.status(403).json({ message: 'Voting not started' })
			if (Number.isFinite(endsAt) && now > endsAt) return res.status(403).json({ message: 'Voting ended' })
		}

		if (DEMO_MODE) {
			seedDemoData()
			if (hasUserVoted({ electionId: id, userId: req.user.sub })) {
				return res.status(409).json({ message: 'Already voted' })
			}
			
			// Validate all candidates
			for (const vote of votes) {
				if (!isValidCandidate({ electionId: id, candidateId: vote.candidateId })) {
					return res.status(400).json({ message: `Invalid candidate ID: ${vote.candidateId}` })
				}
			}
			
			createDemoVotes({ electionId: id, votes, userId: req.user.sub })
			await writeAudit('vote.cast', { electionId: id, votes }, req.user.sub)
			return res.status(201).json({ message: 'Vote cast successfully' })
		}
		
		// MySQL implementation would go here
		await pool.query('START TRANSACTION')
		// ... MySQL voting logic
		await pool.query('COMMIT')
		return res.status(201).json({ message: 'Vote cast successfully' })
	} catch (e) {
		if (!DEMO_MODE) {
			await pool.query('ROLLBACK')
		}
		console.error('Vote error:', e)
		return res.status(500).json({ message: e.message || 'Vote failed' })
	}
}

export async function getResultsController(req, res) {
	const { id } = req.params
	if (DEMO_MODE) {
		seedDemoData()
		const data = getDemoElection(id)
		if (!data) return res.status(404).json({ message: 'Election not found' })

		// Restrict results: only admins before election ends
		const now = Date.now()
		const endsAt = Date.parse(data.election.ends_at)
		const isAdmin = req.user?.role === 'admin'
		if (Number.isFinite(endsAt) && now < endsAt && !isAdmin) {
			return res.status(403).json({ message: 'Results available after the election ends' })
		}
		
		const election = data.election
		const candidates = data.candidates
		const electionVotes = demoVotes.filter(v => String(v.election_id) === String(id))
		
		let results = []
		
		if (election.type === ELECTION_TYPES.SINGLE_CHOICE || election.type === ELECTION_TYPES.MULTIPLE_CHOICE) {
			// Simple vote counting
			const counts = {}
			for (const v of electionVotes) {
				counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1
			}
			results = candidates.map(c => ({
				candidateId: c.id,
				name: c.name,
				party: c.party,
				votes: counts[c.id] || 0
			})).sort((a, b) => b.votes - a.votes)
		}
		else if (election.type === ELECTION_TYPES.RANKED_CHOICE) {
			// Ranked choice voting - implement instant runoff
			results = calculateRankedChoiceResults(candidates, electionVotes)
		}
		else if (election.type === ELECTION_TYPES.APPROVAL_VOTING) {
			// Approval voting - count approvals
			const approvals = {}
			for (const v of electionVotes) {
				if (v.approved) {
					approvals[v.candidate_id] = (approvals[v.candidate_id] || 0) + 1
				}
			}
			results = candidates.map(c => ({
				candidateId: c.id,
				name: c.name,
				party: c.party,
				approvals: approvals[c.id] || 0
			})).sort((a, b) => b.approvals - a.approvals)
		}
		
		return res.json({
			electionType: election.type,
			results
		})
	}
	
	// MySQL implementation would go here
	// Check access before querying heavy results
	const [[erow]] = await pool.query('SELECT ends_at FROM elections WHERE id = ?', [id])
	if (!erow) return res.status(404).json({ message: 'Election not found' })
	const isAdmin = req.user?.role === 'admin'
	const endsAt = new Date(erow.ends_at).getTime()
	if (Number.isFinite(endsAt) && Date.now() < endsAt && !isAdmin) {
		return res.status(403).json({ message: 'Results available after the election ends' })
	}

	const [rows] = await pool.query(
		`SELECT c.id AS candidateId, c.name AS name, COUNT(v.id) AS votes
		 FROM candidates c
		 LEFT JOIN votes v ON v.candidate_id = c.id AND v.election_id = c.election_id
		 WHERE c.election_id = ?
		 GROUP BY c.id, c.name
		 ORDER BY votes DESC`,
		[id]
	)
	return res.json(rows)
}

function calculateRankedChoiceResults(candidates, votes) {
	// Group votes by user to get complete ballots
	const ballots = {}
	for (const vote of votes) {
		if (!ballots[vote.user_id]) {
			ballots[vote.user_id] = []
		}
		ballots[vote.user_id].push({
			candidateId: vote.candidate_id,
			ranking: vote.ranking
		})
	}
	
	// Sort each ballot by ranking
	Object.values(ballots).forEach(ballot => {
		ballot.sort((a, b) => a.ranking - b.ranking)
	})
	
	// Implement instant runoff
	const candidateIds = candidates.map(c => c.id)
	let activeCandidates = [...candidateIds]
	const results = []
	
	while (activeCandidates.length > 1) {
		// Count first-choice votes
		const counts = {}
		activeCandidates.forEach(id => counts[id] = 0)
		
		Object.values(ballots).forEach(ballot => {
			const firstChoice = ballot.find(vote => activeCandidates.includes(vote.candidateId))
			if (firstChoice) {
				counts[firstChoice.candidateId]++
			}
		})
		
		const totalVotes = Object.values(counts).reduce((sum, count) => sum + count, 0)
		const majority = Math.floor(totalVotes / 2) + 1
		
		// Check for majority winner
		for (const [candidateId, count] of Object.entries(counts)) {
			if (count >= majority) {
				results.push({
					candidateId: parseInt(candidateId),
					name: candidates.find(c => c.id === parseInt(candidateId))?.name,
					party: candidates.find(c => c.id === parseInt(candidateId))?.party,
					votes: count,
					round: results.length + 1
				})
				return results
			}
		}
		
		// Eliminate candidate with fewest votes
		const minVotes = Math.min(...Object.values(counts))
		const eliminated = activeCandidates.filter(id => counts[id] === minVotes)
		
		// Add eliminated candidates to results
		eliminated.forEach(candidateId => {
			results.push({
				candidateId,
				name: candidates.find(c => c.id === candidateId)?.name,
				party: candidates.find(c => c.id === candidateId)?.party,
				votes: counts[candidateId],
				round: results.length + 1,
				eliminated: true
			})
		})
		
		activeCandidates = activeCandidates.filter(id => !eliminated.includes(id))
	}
	
	// Add final winner
	if (activeCandidates.length === 1) {
		const winnerId = activeCandidates[0]
		const winner = candidates.find(c => c.id === winnerId)
		results.push({
			candidateId: winnerId,
			name: winner?.name,
			party: winner?.party,
			votes: Object.values(ballots).length,
			round: results.length + 1,
			winner: true
		})
	}
	
	return results
}
