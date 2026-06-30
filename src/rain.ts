// Mostly from https://gist.github.com/kiding/5233f0ffe179d36b16dfc9f3cb908a31

import { Indexed as IndexedPNG } from './png/indexed.ts'
import { search as mapSearch } from './daummap.ts'

const toXY = (lat: number, lon: number) => {
	const RE = 6371.00877 // 지구 반경(km)
	const GRID = 5.0 // 격자 간격(km)
	const SLAT1 = 30.0 // 투영 위도1(degree)
	const SLAT2 = 60.0 // 투영 위도2(degree)
	const OLON = 126.0 // 기준점 경도(degree)
	const OLAT = 38.0 // 기준점 위도(degree)
	const XO = 43 // 기준점 X좌표(GRID)
	const YO = 136 // 기준점 Y좌표(GRID)

	const DEGRAD = Math.PI / 180.0
	const re = RE / GRID
	const slat1 = SLAT1 * DEGRAD
	const slat2 = SLAT2 * DEGRAD
	const olon = OLON * DEGRAD
	const olat = OLAT * DEGRAD

	let sn =
		Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
		Math.tan(Math.PI * 0.25 + slat1 * 0.5)
	sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
	let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
	sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn
	let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
	ro = (re * sf) / Math.pow(ro, sn)

	let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5)
	ra = (re * sf) / Math.pow(ra, sn)

	let theta = lon * DEGRAD - olon
	if (theta > Math.PI) theta -= 2.0 * Math.PI
	if (theta < -Math.PI) theta += 2.0 * Math.PI
	theta *= sn

	return {
		x: Math.floor(ra * Math.sin(theta) + XO + 0.5),
		y: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
	}
}

const toTimestamp = (date: Date) => {
	const year = date.getUTCFullYear()
	const month = date.getUTCMonth() + 1
	const day = date.getUTCDate()
	const hour = date.getUTCHours()
	const minute = date.getUTCMinutes()

	return [
		(year + '').padStart(4, '0'),
		(month + '').padStart(2, '0'),
		(day + '').padStart(2, '0'),
		(hour + '').padStart(2, '0'),
		(minute + '').padStart(2, '0'),
	].join('')
}

const processRainData = (resultList: readonly [string, string, number][]) => {
	const data = Array.from({ length: 72 }, () => 0)
	const toTime = Array.from({ length: 72 }, () => '')

	// [ '2026.06.01.14:20', '+-010min', 0 ]
	for (const [timestamp, relative, rain] of resultList) {
		const time = timestamp.split('.').pop() ?? ''
		if (!/^[0-9]{2}:[0-9]{2}$/.test(time)) continue

		const numStr = relative.match(/^\+([0-9]+)min$/)?.[1]
		if (numStr == null) continue
		const minute = Number(numStr)
		if (isNaN(minute)) continue

		const index = (minute / 10) | 0
		data[index] = rain
		toTime[index] = time
	}

	return { data, toTime }
}

const drawGraph = (data: number[]): Uint8Array => {
	const barWidth = 8
	const bars = data.length
	const barScale = 100
	const barMax = 2
	const paddingX = 16
	const paddingY = 16
	const tickY = 4
	const tickThick = 2
	const tickSize = 6
	const contentWidth = bars * barWidth
	const contentHeight = Math.ceil(barMax * barScale)
	const width = contentWidth + paddingX * 2
	const height = contentHeight + paddingY * 2

	const colors: [number, number, number][] = []

	// const white = 0
	colors.push([255, 255, 255])

	const blue = 1
	colors.push([78, 121, 165])

	const gray = 2
	colors.push([180, 180, 180])

	const png = new IndexedPNG({ width, height, colors })

	for (let x = 0; x < width; ++x) {
		// y-axis
		if (paddingX - tickThick <= x && x < paddingX) {
			const downBound = contentHeight + paddingY + tickThick + tickY
			for (let y = 0; y < height; ++y) {
				if (paddingY <= y && y < downBound) png.drawPoint(x, y, gray)
			}
			continue
		}

		if (x < paddingX || contentWidth + paddingX <= x) {
			continue
		}

		const index = ((x - paddingX) / barWidth) | 0
		const miniX = (x - paddingX) % barWidth
		const value = data[index] ?? 0
		const currentHeight = Math.min(Math.round(value * barScale), contentHeight)
		for (let y = 0; y < height; ++y) {
			// x-axis
			if (
				contentHeight + paddingY <= y &&
				y < contentHeight + paddingY + tickThick
			) {
				png.drawPoint(x, y, gray)
				continue
			}

			// tick
			if (
				(index + 1) % tickSize === 0 &&
				barWidth - miniX <= tickThick &&
				contentHeight + paddingY + tickThick <= y &&
				y < contentHeight + paddingY + tickThick + tickY
			) {
				png.drawPoint(x, y, gray)
				continue
			}

			if (
				y < paddingY ||
				contentHeight + paddingY <= y ||
				barWidth - miniX <= tickThick
			) {
				continue
			}

			if (contentHeight - (y - paddingY) <= currentHeight) {
				png.drawPoint(x, y, blue)
			}
		}
	}

	return png.pack()
}

// const trace = <T>(x: T): T => (console.log('trace', x), x)

const getRainData = async (lat: number, lon: number) => {
	const url = 'https://vapi.kma.go.kr/capi/url/vs_prcp_blnd_pt_txt1.php'

	const { x, y } = toXY(lat, lon)

	const qs = new URLSearchParams()
	qs.set('tm', toTimestamp(new Date()))
	qs.set('x', x + '')
	qs.set('y', y + '')
	qs.set('disp', 'V')
	qs.set('type', 'BLND')

	const response = (await fetch(`${url}?${qs.toString()}`)
		.then(v => v.json())
		.catch(() => null)) as {
		data?: { resultList?: [string, string, number][] }
	} | null
	const resultList = response?.data?.resultList ?? []

	return processRainData(resultList)
}

export const rain = async (
	kakaoToken: string,
	keyword: string,
): Promise<{ message: string; graph?: Uint8Array }> => {
	const { lat, lng, address } = await mapSearch(kakaoToken, keyword)
	const { data } = await getRainData(+lat, +lng)

	if (data.every(v => v === 0)) {
		return { message: `[${address}]\n12시간 이내 비소식이 없습니다.` }
	}

	const graph = drawGraph(data)
	return {
		message: `[${address}]\n초단기 강수 예측 (최대 12시간, 10분 단위 막대, 1시간 단위 눈금)`,
		graph,
	}
}
