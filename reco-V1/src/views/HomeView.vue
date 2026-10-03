<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const PER = 2 // hauteur de scroll par reco, en écrans

const recos = ref([])
const progress = ref(0)
const active = ref(null)
const menuOpen = ref(false)

let ticking = false

onMounted(async () => {
	const { data } = await supabase
		.from('recommendations')
		.select('*')
		.order('published_at', { ascending: false })
	recos.value = data ?? []
	window.addEventListener('scroll', onScroll, { passive: true })
	onScroll()
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))

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

const search = ref('')

const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const filtered = computed(() => {
	const q = norm(search.value.trim())
	return recos.value
		.map((r, i) => ({ ...r, i }))
		.filter((r) => !q || norm(r.title).includes(q) || norm(r.artist).includes(q))
})

const ease = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)

const idx = computed(() => Math.min(Math.floor(progress.value), Math.max(recos.value.length - 1, 0)))
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
</script>

<template>
	<div class="scroller" :style="{ height: scrollerHeight }">
		<UButton v-if="menuOpen === false" icon="i-lucide-menu" color="neutral" variant="subtle" aria-label="Menu"
			class="fixed top-4 right-4 z-10" @click="menuOpen = true" />
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
		<div v-if="current" class="stage">
			<div class="card" :style="{ transform: `scale(${scale}) rotateY(${flip}deg)` }">
				<div class="face front" @click="flipToCard">
					<img :src="frontReco.cover_url" :alt="frontReco.title" />
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
	bottom: 2rem;
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
</style>