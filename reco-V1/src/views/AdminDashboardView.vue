<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { coverPath } from '@/lib/covers'
import { useAuthStore } from '@/stores/auth'
import GenresModal from '@/components/GenresModal.vue'

const auth = useAuthStore()
const router = useRouter()

const recos = ref([])
const message = ref('')
const modalOpen = ref(false)
const selected = ref(null)
const search = ref('')
const genresOpen = ref(false)

const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const filtered = computed(() => {
	const q = norm(search.value.trim())
	if (!q) return recos.value
	return recos.value.filter((r) => norm(r.title).includes(q) || norm(r.artist).includes(q))
})

async function loadRecos() {
	const { data, error } = await supabase
		.from('recommendations')
		.select('*')
		.order('published_at', { ascending: false })
	if (!error) recos.value = data
}

onMounted(loadRecos)

function openAdd() {
	selected.value = null
	modalOpen.value = true
}

function openEdit(r) {
	selected.value = r
	modalOpen.value = true
}

async function remove(r) {
	if (!confirm(`Supprimer "${r.title}" ?`)) return
	message.value = ''

	const { data, error } = await supabase
		.from('recommendations')
		.delete()
		.eq('id', r.id)
		.select()
	if (error) { message.value = error.message; return }
	if (!data.length) { message.value = 'Suppression refusée (vérifie les règles RLS)'; return }

	const path = coverPath(r.cover_url)
	if (path) await supabase.storage.from('covers').remove([path])

	message.value = 'Reco supprimée 🗑️'
	await loadRecos()
}

async function logout() {
	await auth.logout()
	router.push({ name: 'admin-login' })
}

async function home() {
	router.push({ name: 'home' })
}
</script>

<template>
	<div class="mt-2 mb-4">
		<div class="div-header">
			<div class="div-header-left">
				<UButton label="Ajouter une reco" @click="openAdd" class="mr-2" />
				<UButton label="Gérer les styles" color="neutral" variant="subtle" @click="genresOpen = true" />
			</div>
			<div class="div-header-right">
				<UButton label="Home" color="neutral" variant="subtle" @click="home" class="mr-2"/>
				<UButton label="Logout" color="neutral" variant="subtle" @click="logout" />
			</div>
		</div>
		<GenresModal v-model:open="genresOpen" />
		<p>{{ message }}</p>
		<RecoModal v-model:open="modalOpen" :reco="selected" @saved="loadRecos" />
		<UInput v-model="search" icon="i-lucide-search" placeholder="Rechercher un titre ou un artiste"
			class="w-full sm:w-1/3 mx-auto mb-4 block" />
		<div class="div-card">
			<UCard v-for="r in filtered" :key="r.id" class="card-reco"
				:ui="{ root: 'flex flex-col h-full', body: 'flex-1 pb-3! sm:pb-3!' }">
				<img v-if="r.cover_url" :src="r.cover_url" :alt="r.title"
					class="aspect-square object-cover rounded" />
				<h3 class="title">{{ r.title }}</h3>
				<p class="artist">{{ r.artist }}</p>
				<template #footer>
					<div class="flex gap-2">
						<UButton icon="i-lucide-pencil" color="neutral" variant="subtle" class="flex-1 justify-center" @click="openEdit(r)" />
						<UButton icon="i-lucide-trash-2" color="error" variant="subtle" class="flex-1 justify-center" @click="remove(r)" />
					</div>
				</template>
			</UCard>
		</div>
	</div>
</template>

<style scoped>
.div-header {
	display: flex;
	justify-content: space-between;
	margin: 1em 1em 3em 1em;
}
.div-header-left, .div-header-right {
	display: inline-flex;
}
.title {
	margin-top: 0.5em;
}
.artist {
	margin-top: 0.2em;
	font-size: small;
}
.div-card {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(12em, 1fr));
	gap: 1em;
	margin: 0 2em;
}
</style>