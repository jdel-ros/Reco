<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { getPalette } from '@/lib/palette'

const route = useRoute()
const router = useRouter()
const PER = 2 // hauteur de scroll par reco, en écrans
const bg = ref({ a: '#141210', b: '#141210' })
const recos = ref([])
const progress = ref(0)
const active = ref(null)
const menuOpen = ref(false)
const shuffling = ref(false)
const rollCover = ref(null)
const search = ref('')
const isMobile = ref(false)
let linkReady = false
let mq
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const idx = computed(() => Math.min(Math.floor(progress.value), Math.max(recos.value.length - 1, 0)))

let bgTimer
let ticking = false

onMounted(async () => {
	const { data } = await supabase
		.from('recommendations')
		.select('*')
		.order('published_at', { ascending: false })
	recos.value = data ?? []
	recos.value.forEach((r) => { if (r.cover_url) new Image().src = r.cover_url })

	window.addEventListener('scroll', onScroll, { passive: true })
	window.addEventListener('keydown', onKey)

	const i = recos.value.findIndex((r) => r.id === route.query.reco)
	await nextTick()
	if (i > 0) window.scrollTo({ top: i * window.innerHeight * PER, behavior: 'instant' })
	onScroll()
	mq = window.matchMedia('(max-width: 640px)')
	isMobile.value = mq.matches
	mq.addEventListener('change', updateMobile)
	linkReady = true
})

let urlTimer
watch(idx, () => {
	if (!linkReady || !current.value) return
	clearTimeout(urlTimer)
	urlTimer = setTimeout(() => router.replace({ query: { reco: current.value.id } }), 400)
})

function updateMobile(e) {
	isMobile.value = e.matches
}

const copied = ref(false)

async function copyLink() {
	const url = `${location.origin}${route.path}?reco=${current.value.id}`
	await navigator.clipboard.writeText(url)
	copied.value = true
	setTimeout(() => (copied.value = false), 1500)
}

onUnmounted(() => {
	window.removeEventListener('scroll', onScroll)
	window.removeEventListener('keydown', onKey)
	mq?.removeEventListener('change', updateMobile)
	clearTimeout(bgTimer)
	clearTimeout(urlTimer)
})

async function randomReco() {
	if (shuffling.value || recos.value.length < 2) return
	let i
	do {
		i = Math.floor(Math.random() * recos.value.length)
	} while (i === idx.value)

	window.scrollTo({ top: i * window.innerHeight * PER, behavior: 'instant' })
	shuffling.value = true

	let delay = 60
	while (delay < 320) {
		rollCover.value = recos.value[Math.floor(Math.random() * recos.value.length)]
		await sleep(delay)
		delay *= 1.25
	}
	rollCover.value = recos.value[i]
	await sleep(250)
	shuffling.value = false
}

function onScroll() {
	if (ticking) return
	ticking = true
	requestAnimationFrame(() => {
		progress.value = Math.max(0, window.scrollY / (window.innerHeight * PER))
		ticking = false
	})
}

function goTo(i) {
	window.scrollTo({ top: i * window.innerHeight * PER, behavior: 'instant' })
	menuOpen.value = false
	search.value = ''
}

function onKey(e) {
	if (menuOpen.value || shuffling.value) return
	if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
	if (e.key === 'ArrowRight' && idx.value < recos.value.length - 1) goTo(idx.value + 1)
	if (e.key === 'ArrowLeft' && idx.value > 0) goTo(idx.value - 1)
}


const filtered = computed(() => {
	const q = norm(search.value.trim())
	return recos.value
		.map((r, i) => ({ ...r, i }))
		.filter((r) => !q || norm(r.title).includes(q) || norm(r.artist).includes(q))
})

const ease = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)

const t = computed(() => progress.value - idx.value)

const flip = computed(() => {
	const x = t.value
	if (x < 0.35) return ease(x / 0.35) * 180
	if (x < 0.65) return 180
	return 180 + ease((x - 0.65) / 0.35) * 180
})
const scale = computed(() => 0.5 + 0.5 * Math.sin((Math.PI * flip.value) / 360))

const current = computed(() => recos.value[idx.value])
const frontReco = computed(() => (t.value >= 0.5 ? recos.value[idx.value + 1] ?? current.value : current.value))

const scrollerHeight = computed(() => `${((recos.value.length - 1) * PER + PER * 0.65 + 1) * 100}vh`)

const inCard = computed(() => t.value > 0.3 && t.value < 0.7)
watch(inCard, (v) => { if (!v) active.value = null })

const links = computed(() => [
	{ key: 'spotify', icon: 'simple-icons:spotify', url: current.value?.spotify_url },
	{ key: 'deezer', icon: 'simple-icons:deezer', url: current.value?.deezer_url },
	{ key: 'apple', icon: 'simple-icons:applemusic', url: current.value?.apple_url },
].filter((l) => l.url))

function embed(key, url) {
	if (key === 'spotify') {
		const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist)\/([A-Za-z0-9]+)/)
		return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null
	}
	if (key === 'deezer') {
		const m = url.match(/deezer\.com\/(?:[a-z]{2}\/)?(track|album|playlist)\/(\d+)/)
		return m ? `https://widget.deezer.com/widget/dark/${m[1]}/${m[2]}` : null
	}
	if (key === 'apple') {
		return url.includes('music.apple.com') ? url.replace('music.apple.com', 'embed.music.apple.com') : null
	}
}

const activeSrc = computed(() => {
	const l = links.value.find((l) => l.key === active.value)
	return l ? embed(l.key, l.url) : null
})
const playerHeight = computed(() => (current.value?.type === 'track' ? 152 : 352))

function toggle(key) {
	active.value = active.value === key ? null : key
}

function flipToCard() {
	window.scrollTo({ top: (idx.value + 0.4) * window.innerHeight * PER, behavior: 'smooth' })
}

watch(frontReco, (r) => {
	clearTimeout(bgTimer)
	bgTimer = setTimeout(async () => {
		const p = await getPalette(r?.cover_url)
		if (p) bg.value = p
	}, 300)
}, { immediate: true })

</script>

<template>
	<div class="scroller" :style="{ height: scrollerHeight }">
		<div v-if="menuOpen === false">
			<UButton icon="i-lucide-shuffle" color="neutral" variant="subtle" aria-label="Reco aléatoire"
				class="fixed top-4 right-16 z-10" :ui="{ leadingIcon: shuffling ? 'animate-spin' : '' }" @click="randomReco" />
			<UButton :icon="copied ? 'i-lucide-check' : 'i-lucide-link'" color="neutral" variant="subtle"
				aria-label="Copier le lien" class="fixed top-4 right-28 z-10" @click="copyLink" />
			<UButton icon="i-lucide-menu" color="neutral" variant="subtle" aria-label="Menu"
				class="fixed top-4 right-4 z-10" @click="menuOpen = true" />
		</div>
		{{ console.log(isMobile) }}
		{{ console.log(menuOpen) }}
		<p v-if="!(isMobile && menuOpen)" class="counter">{{ idx + 1 }} / {{ recos.length }}</p>
		<USlideover v-model:open="menuOpen" side="right" title="Les recos" description="Choisis une reco">
			<template #body>
				<UInput v-model="search" icon="i-lucide-search" placeholder="Titre ou artiste" class="w-full mb-3" />

				<button v-for="r in filtered" :key="r.id"
					class="flex w-full items-center gap-3 p-2 rounded-lg text-left hover:bg-elevated"
					:class="{ 'bg-elevated': r.i === idx }" @click="goTo(r.i)">
					<img :src="r.cover_url" :alt="r.title" class="size-12 rounded object-cover" />
					<p class="truncate">{{ r.artist }}</p>
				</button>

				<p v-if="!filtered.length" class="text-muted">Aucune reco trouvée.</p>
			</template>
		</USlideover>
		<div v-if="current" class="stage" :style="{ '--bg-a': bg.a, '--bg-b': bg.b }">
			<div class="card" :style="{ transform: `scale(${scale}) rotateY(${flip}deg)` }">
				<div class="face front" @click="flipToCard">
					<img :src="(shuffling ? rollCover : frontReco).cover_url" :alt="frontReco.title" :class="{ rolling: shuffling }" />				
				</div>
				<div class="face back">
					<img v-if="current.cover_url" :src="current.cover_url" :alt="current.title" class="thumb" />
					<h1>{{ current.title }}</h1>
					<p class="artist">{{ current.artist }}</p>
					<p class="desc">{{ current.description }}</p>
					<div class="players">
						<button v-for="l in links" :key="l.key" class="p-btn" :class="{ on: active === l.key }"
							@click="toggle(l.key)">
							<UIcon :name="l.icon" class="size-6" />
						</button>
					</div>
					<Transition name="player">
						<iframe v-if="activeSrc" :key="activeSrc" :src="activeSrc" width="100%" :height="playerHeight"
							frameborder="0" allow="encrypted-media" class="player">
						</iframe>
					</Transition>
				</div>
			</div>
			<p v-if="progress < 0.05" class="hint">Scroll ↓</p>
		</div>
	</div>
</template>

<style scoped>
.stage {
	position: sticky;
	top: 0;
	height: 100vh;
	display: grid;
	place-items: center;
	perspective: 1400px;
	overflow: hidden;
	background: radial-gradient(circle at 50% 40%, var(--bg-a), var(--bg-b) 85%);
	transition: --bg-a 1.5s ease, --bg-b 1.5s ease;
}

.card {
	--w: min(90vw, 30rem);
	--h: min(85vh, 38rem);
	position: relative;
	width: var(--w);
	height: var(--h);
	transform-style: preserve-3d;
	will-change: transform;
}

.face {
	position: absolute;
	inset: 0;
	backface-visibility: hidden;
}

.front {
	display: grid;
	place-items: center;
	cursor: pointer;
}

.front img {
	width: 100%;
	aspect-ratio: 1;
	object-fit: cover;
	border-radius: 12px;
	box-shadow: 0 20px 60px rgb(0 0 0 / 0.6);
	transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s;
}
.front img.rolling {
	filter: blur(3px);
	transform: scale(0.96);
}

.back {
	transform: rotateY(180deg);
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
	padding: 1.5rem;
	overflow: auto;
	background: var(--surface);
	border: 1px solid var(--border);
	border-radius: 16px;
}

.thumb {
	width: 5rem;
	aspect-ratio: 1;
	object-fit: cover;
	border-radius: 8px;
}

.artist {
	color: var(--text-muted);
}

.desc {
	flex: 1;
}

.hint {
	position: absolute;
	bottom: 4rem;
	color: var(--text-muted);
}

.players {
	display: flex;
	gap: 0.75rem;
}

.p-btn {
	width: 2.75rem;
	aspect-ratio: 1;
	display: grid;
	place-items: center;
	border-radius: 999px;
	border: 1px solid var(--border);
	color: var(--text-muted);
	transition: all 0.2s;
}

.p-btn:hover,
.p-btn.on {
	color: var(--bg);
	background: var(--accent);
	border-color: var(--accent);
}

.player {
	border-radius: 12px;
}

.player-enter-active,
.player-leave-active {
	transition: opacity 0.3s, transform 0.3s;
}

.player-enter-from,
.player-leave-to {
	opacity: 0;
	transform: translateY(12px) scale(0.97);
}

.counter {
	position: fixed;
	top: 1.25rem;
	left: 1rem;
	z-index: 10;
	color: var(--text-muted);
	font-variant-numeric: tabular-nums;
	letter-spacing: 0.1em;
}
</style>