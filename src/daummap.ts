const request = (token: string, path: string) =>
	fetch('https://dapi.kakao.com' + path, {
		headers: {
			authorization: 'KakaoAK ' + token,
			accept: 'application/json',
		},
	}).then(v => v.json())

const converter = (
	response: unknown,
): Promise<{ lng: string; lat: string; address: string }> => {
	const resp = response as {
		documents?: { x: string; y: string; address_name: string }[]
	} | null

	const coord = resp?.documents?.[0]
	return coord != null
		? Promise.resolve({
				lng: coord.x,
				lat: coord.y,
				address: coord.address_name,
			})
		: Promise.reject(resp)
}

export const search = (
	token: string,
	query: string,
): Promise<{ lng: string; lat: string; address: string }> => {
	const encodedQuery = encodeURIComponent(query)

	const address = request(
		token,
		'/v2/local/search/address.json?page=1&size=1&query=' + encodedQuery,
	).then(converter)

	const keyword = request(
		token,
		'/v2/local/search/keyword.json?page=1&size=1&sort=accuracy&query=' +
			encodedQuery,
	).then(converter)

	return address.catch(() => keyword)
}
