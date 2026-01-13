// https://solved.ac/api/v3/search/problem
// ?query=(#geometry -s@user *g $solved_desc)
// &page=1&sort=solved&direction=asc

import type {
	APIEmbedField,
	APIInteractionResponseCallbackData,
} from 'discord-api-types/v10'

// ComponentType
const COMPONENT_ACTION_ROW = 1
const COMPONENT_BUTTON = 2

// ButtonStyle
const BUTTON_STYLE_LINK = 5

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
const PREVIEW_COUNT = 6

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

const toField = (v: Item): APIEmbedField => ({
	name: `*${levels[v.level]} ${v.problemId}`,
	value: [
		`[${v.titleKo || v.problemId}](https://www.acmicpc.net/problem/${v.problemId})`,
		v.tags.map(tag => `#${tag.key}`).join(' '),
	].join('\n'),
	inline: true,
})

export const solvedac = async (
	query: string,
	sort?: string,
): Promise<APIInteractionResponseCallbackData> => {
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
	if (data == null || data.items.length === 0) {
		return { content: NO_RESULT }
	}

	const fields = data.items.slice(0, PREVIEW_COUNT).map(toField)
	const buttonRow = {
		type: COMPONENT_ACTION_ROW,
		components: [
			{
				type: COMPONENT_BUTTON,
				label: '더 보기',
				style: BUTTON_STYLE_LINK,
				url: `https://solved.ac/problems?${qs}`,
			},
		],
	}

	return { embeds: [{ fields }], components: [buttonRow] }
}
