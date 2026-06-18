#!/usr/bin/env node

import { loadEnvFile } from 'node:process'
import type { APIApplicationCommand } from 'discord-api-types/v10'

loadEnvFile()

const { DISCORD_TOKEN, DISCORD_APPLICATION_ID, DISCORD_TEST_GUILD_ID } =
	process.env
if (DISCORD_APPLICATION_ID == null || DISCORD_APPLICATION_ID === '') {
	throw new Error('DISCORD_APPLICATION_ID is not given')
}
if (DISCORD_TOKEN == null || DISCORD_TOKEN === '') {
	throw new Error('DISCORD_TOKEN is not given')
}
if (DISCORD_TEST_GUILD_ID == null || DISCORD_TEST_GUILD_ID === '') {
	throw new Error('DISCORD_TEST_GUILD_ID is not given')
}

// ApplicationCommandOptionType
const StringType = 3

// ApplicationCommandType
const SlashCommand = 1

const commandSolvedAc: Partial<APIApplicationCommand> = {
	type: SlashCommand,
	name: 'solved-ac',
	description: 'solved.ac 문제 검색',
	options: [
		{
			type: StringType,
			name: 'query',
			description: '쿼리',
			required: true,
		},
		{
			type: StringType,
			name: 'sort',
			description: '정렬',
			required: false,
			choices: [
				{ name: 'ID (오름차순)', value: 'id asc' },
				{ name: 'ID (내림차순)', value: 'id desc' },
				{ name: '레벨 (쉬운 순)', value: 'level asc' },
				{ name: '레벨 (어려운 순)', value: 'level desc' },
				{ name: '제목 (오름차순)', value: 'title asc' },
				{ name: '제목 (내림차순)', value: 'title desc' },
				{ name: '푼 사람 수 (적은 순)', value: 'solved asc' },
				{ name: '푼 사람 수 (많은 순)', value: 'solved desc' },
				{ name: '평균 시도 (적은 순)', value: 'average_try asc' },
				{ name: '평균 시도 (많은 순)', value: 'average_try desc' },
				{ name: '랜덤', value: 'random' },
			],
		},
	],
}

const commandRain: Partial<APIApplicationCommand> = {
	type: SlashCommand,
	name: 'rain',
	description: '기상청 초단기 강수 예측',
	options: [
		{
			type: StringType,
			name: 'place',
			description: '장소',
			required: true,
		},
	],
}

const url = `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${DISCORD_TEST_GUILD_ID}/commands`

if (import.meta.main) {
	await fetch(url, {
		headers: {
			'content-type': 'application/json',
			authorization: `Bot ${DISCORD_TOKEN}`,
		},
		method: 'PUT',
		body: JSON.stringify([commandSolvedAc, commandRain]),
	})
		.then(v => v.json())
		.then(v => {
			console.log(JSON.stringify(v, null, 2))
		})
}
