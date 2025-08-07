// https://solved.ac/api/v3/search/problem
// ?query=(#geometry -s@user *g $solved_desc)
// &page=1&sort=solved&direction=asc

interface Problems {
	count: number
	items: Item[]
}

interface Item {
	problemId: number
	titleKo: string
	isSolvable: boolean
	acceptedUserCount: number
	level: number
	averageTries: number
	tags: Tag[]
}

interface Tag {
	key: string
	displayNames: { language: string; name: string; short: string }[]
}

const NO_RESULT = '검색결과가 없습니다'

const levels = `
ur
b5 b4 b3 b2 b1
s5 s4 s3 s2 s1
g5 g4 g3 g2 g1
p5 p4 p3 p2 p1
d5 d4 d3 d2 d1
r5 r4 r3 r2 r1
`
	.trim()
	.split(/\s+/)

export const solvedac = async (
	query: string,
	sort?: string,
): Promise<string> => {
	const [sortBy = 'id', direction = 'asc'] = (sort || 'id').split(' ')

	const qs = new URLSearchParams()
	qs.set('query', query)
	qs.set('sort', sortBy)
	qs.set('direction', direction)
	qs.set('page', '1')

	const url = `https://solved.ac/api/v3/search/problem?${qs}`
	const data = (await fetch(url)
		.then(v => v.json())
		.catch(() => null)) as Problems | null
	if (data == null) {
		return NO_RESULT
	}

	return data.items
		.slice(0, 5)
		.map(v =>
			[
				`*${levels[v.level]} ${v.problemId} ${v.titleKo}`,
				v.tags.map(tag => `#${tag.key}`).join(' '),
				`https://www.acmicpc.net/problem/${v.problemId}`,
			].join('\n'),
		)
		.join('\n\n')
}
