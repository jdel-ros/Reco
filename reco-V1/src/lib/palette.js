const cache = new Map()

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const css = (c, k) => `rgb(${Math.round(c[0] * k)} ${Math.round(c[1] * k)} ${Math.round(c[2] * k)})`

export function getPalette(url) {
	if (!url) return Promise.resolve(null)
	if (cache.has(url)) return cache.get(url)

	const p = new Promise((resolve) => {
		const img = new Image()
		img.crossOrigin = 'anonymous'
		img.onerror = () => resolve(null)
		img.onload = () => {
			try {
				const size = 32
				const canvas = document.createElement('canvas')
				canvas.width = canvas.height = size
				const ctx = canvas.getContext('2d', { willReadFrequently: true })
				ctx.drawImage(img, 0, 0, size, size)
				const d = ctx.getImageData(0, 0, size, size).data

				const buckets = new Map()
				for (let i = 0; i < d.length; i += 4) {
					const r = d[i], g = d[i + 1], b = d[i + 2]
					const max = Math.max(r, g, b), min = Math.min(r, g, b)
					const sat = max ? (max - min) / max : 0
					if (max / 255 < 0.12 || (max / 255 > 0.95 && sat < 0.1)) continue
					const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
					const w = 0.2 + sat
					const e = buckets.get(key) ?? { r: 0, g: 0, b: 0, w: 0 }
					e.r += r * w; e.g += g * w; e.b += b * w; e.w += w
					buckets.set(key, e)
				}

				const list = [...buckets.values()]
					.map((e) => [e.r / e.w, e.g / e.w, e.b / e.w, e.w])
					.sort((a, b) => b[3] - a[3])
				if (!list.length) return resolve(null)

				const first = list[0]
				const second = list.find((c) => dist(c, first) > 90) ?? first

				resolve({ a: css(first, 0.5), b: css(second, 0.28) })
			} catch {
				resolve(null)
			}
		}
		img.src = url
	})

	cache.set(url, p)
	return p
}