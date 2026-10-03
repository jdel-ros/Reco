export function coverPath(url) {
	if (!url) return null
	const parts = url.split('/covers/')
	return parts[1] ? decodeURIComponent(parts[1]) : null
}