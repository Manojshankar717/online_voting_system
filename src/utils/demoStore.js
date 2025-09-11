export const ELECTION_TYPES = {
	SINGLE_CHOICE: 'single_choice',
	MULTIPLE_CHOICE: 'multiple_choice',
	RANKED_CHOICE: 'ranked_choice',
	APPROVAL_VOTING: 'approval_voting',
}

export const SCHEDULE_TYPES = ['scheduled', 'ongoing', 'on-demand', 'recurring']

export let demoElections = [
	{
		id: 1,
		title: 'Scheduled Election',
		description: 'A scheduled election with fixed start and end times',
		type: ELECTION_TYPES.SINGLE_CHOICE,
		max_selections: null,
		schedule_type: 'scheduled',
		starts_at: new Date(Date.now() - 3600 * 1000).toISOString(),
		ends_at: new Date(Date.now() + 3600 * 1000).toISOString(),
		status: 'active',
	},
	{
		id: 2,
		title: 'Ongoing Election',
		description: 'An ongoing election with no end time',
		type: ELECTION_TYPES.MULTIPLE_CHOICE,
		max_selections: 3,
		schedule_type: 'ongoing',
		starts_at: new Date(Date.now() - 7200 * 1000).toISOString(),
		ends_at: null,
		status: 'active',
	},
	{
		id: 3,
		title: 'On-Demand Election',
		description: 'An on-demand election started manually',
		type: ELECTION_TYPES.RANKED_CHOICE,
		max_selections: null,
		schedule_type: 'on-demand',
		starts_at: null,
		ends_at: null,
		status: 'draft',
	},
	{
		id: 4,
		title: 'Recurring Election',
		description: 'A recurring election with a weekly pattern',
		type: ELECTION_TYPES.APPROVAL_VOTING,
		max_selections: null,
		schedule_type: 'recurring',
		recurrence_pattern: 'weekly',
		starts_at: null,
		ends_at: null,
		status: 'draft',
	},
]

export let demoCandidates = [
	{ id: 1, election_id: 1, name: 'Alice', party: 'Party A', manifesto: 'Manifesto A' },
	{ id: 2, election_id: 1, name: 'Bob', party: 'Party B', manifesto: 'Manifesto B' },
	{ id: 3, election_id: 2, name: 'Carol', party: 'Party C', manifesto: 'Manifesto C' },
	{ id: 4, election_id: 2, name: 'Dave', party: 'Party D', manifesto: 'Manifesto D' },
	{ id: 5, election_id: 3, name: 'Eve', party: 'Party E', manifesto: 'Manifesto E' },
	{ id: 6, election_id: 4, name: 'Frank', party: 'Party F', manifesto: 'Manifesto F' },
]

export let demoVotes = [
	{ id: 1, election_id: 1, candidate_id: 1, user_id: 1, created_at: new Date().toISOString() },
	{ id: 2, election_id: 1, candidate_id: 2, user_id: 2, created_at: new Date().toISOString() },
	{ id: 3, election_id: 2, candidate_id: 3, user_id: 1, created_at: new Date().toISOString() },
]

export let demoUsers = [
	{ id: 1, name: 'User One', email: 'user1@example.com', role: 'voter' },
	{ id: 2, name: 'User Two', email: 'user2@example.com', role: 'voter' },
]

export function seedDemoData() {
	// This function can be used to reset or seed demo data if needed
}

export function listDemoElections() {
	return demoElections
}

export function getDemoElection(id) {
	const election = demoElections.find(e => e.id === Number(id))
	if (!election) return null
	const candidates = demoCandidates.filter(c => c.election_id === election.id)
	return { election, candidates }
}

export function hasUserVoted({ electionId, userId }) {
	return demoVotes.some(v => v.election_id === Number(electionId) && v.user_id === Number(userId))
}

export function isValidCandidate({ electionId, candidateId }) {
	return demoCandidates.some(c => c.election_id === Number(electionId) && c.id === Number(candidateId))
}

export function createDemoVotes({ electionId, votes, userId }) {
	for (const vote of votes) {
		demoVotes.push({
			id: demoVotes.length + 1,
			election_id: Number(electionId),
			candidate_id: vote.candidateId,
			user_id: Number(userId),
			approved: vote.approved || false,
			ranking: vote.ranking || null,
			created_at: new Date().toISOString(),
		})
	}
}

export function createDemoUser({ name, email, password }) {
	const id = demoUsers.length + 1
	demoUsers.push({
		id,
		name,
		email,
		password_hash: password, // In demo mode, we'll store plain text
		role: 'voter'
	})
	return { id, email }
}

export function findDemoUserByEmail(email) {
	return demoUsers.find(user => user.email === email)
}

export function createDemoElection({
    title,
    description,
    type,
    max_selections,
    schedule_type,
    starts_at,
    ends_at,
    recurrence_pattern,
    status
}) {
    if (!SCHEDULE_TYPES.includes(schedule_type)) {
        throw new Error('Invalid schedule type')
    }
    const id = demoElections.length + 1
    const newElection = {
        id,
        title,
        description,
        type,
        max_selections: max_selections ?? null,
        schedule_type,
        starts_at: starts_at ?? null,
        ends_at: ends_at ?? null,
        recurrence_pattern: recurrence_pattern ?? null,
        status: status ?? 'draft',
    }
    demoElections.push(newElection)
    return newElection
}

export function createMultipleDemoElections(electionsArray) {
    if (!Array.isArray(electionsArray)) {
        throw new Error('Input must be an array of election objects')
    }
    const created = []
    for (const election of electionsArray) {
        const newElection = createDemoElection(election)
        created.push(newElection)
    }
    return created
}
