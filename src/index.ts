import type {
	APIInteraction,
	APIInteractionResponseCallbackData,
} from 'discord-api-types/v10'
import { verifyKey } from 'discord-interactions'

import { solvedac } from './solved-ac.ts'

const text = (text: string, status = 200) =>
	new Response(text, {
		status,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
		},
	})

const json = (json: unknown, status = 200) =>
	new Response(JSON.stringify(json), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	})

const responseInvalidRequest = () => json({ error: 'invalid request' }, 400)
const responseNotFound = () => json({ error: 'not found' }, 404)
const responseServerError = () => json({ error: 'server error' }, 500)

const server = async (req: Request, env: Env): Promise<Response> => {
	const method = req.method.toUpperCase()
	const path = new URL(req.url).pathname

	if (path !== '/') {
		return responseNotFound()
	}

	if (method === 'GET') {
		return text('Hello, world!')
	}

	if (method === 'POST') {
		return await discordBot(req, env)
	}

	return responseInvalidRequest()
}

// InteractionType
const PING = 1
const APPLICATION_COMMAND = 2

// InteractionResponseType
const PONG = 1
const CHANNEL_MESSAGE_WITH_SOURCE = 4
// const DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5
// const DEFERRED_UPDATE_MESSAGE = 6
// const UPDATE_MESSAGE = 7

// ApplicationCommandOptionType
const STRING_TYPE = 3

// ApplicationCommandType
const SLASH_COMMAND = 1

const discordBot = async (req: Request, env: Env): Promise<Response> => {
	const request = await verifyRequest(req, env).catch(() => null)
	if (request == null) {
		return responseInvalidRequest()
	}

	if (request.type === PING) {
		return json({ type: PONG })
	}

	if (
		request.type === APPLICATION_COMMAND &&
		request.data.type === SLASH_COMMAND
	) {
		// string only for now
		const options = {} as Record<string, string | undefined>
		for (const entry of request.data.options ?? []) {
			if (entry.type === STRING_TYPE) {
				options[entry.name] = entry.value
			}
		}

		const commandName = request.data.name.toLowerCase()

		if (commandName === 'solved-ac') {
			let data: APIInteractionResponseCallbackData | null = null
			try {
				data = await commandSolvedAc(options)
			} catch {
				return responseServerError()
			}

			if (data == null) {
				return responseInvalidRequest()
			}

			return json({
				type: CHANNEL_MESSAGE_WITH_SOURCE,
				data,
			})
		}
	}

	return responseInvalidRequest()
}

const commandSolvedAc = (
	options: Record<string, string | undefined>,
): Promise<APIInteractionResponseCallbackData | null> => {
	const query = options['query']
	const sort = options['sort']

	if (query != null) {
		return solvedac(query, sort)
	}
	return Promise.resolve(null)
}

const verifyRequest = async (
	req: Request,
	env: Env,
): Promise<APIInteraction> => {
	const sig = req.headers.get('x-signature-ed25519')
	const timestamp = req.headers.get('x-signature-timestamp')
	if (sig == null || timestamp == null) {
		return Promise.reject()
	}

	const body = await req.text()
	if (!(await verifyKey(body, sig, timestamp, env.DISCORD_PUBLIC_KEY))) {
		return Promise.reject()
	}

	try {
		return JSON.parse(body)
	} catch {
		return Promise.reject()
	}
}

const app: { readonly fetch: (req: Request, env: Env) => Promise<Response> } = {
	fetch: server,
}

export default app
