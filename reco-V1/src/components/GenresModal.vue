<script setup>
import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const open = defineModel('open')
const emit = defineEmits(['changed'])

const genres = ref([])
const recos = ref([])
const links = ref([])
const selectedId = ref(null)
const newName = ref('')
const renaming = ref(false)
const renameValue = ref('')
const picking = ref(false)
const pickSearch = ref('')
const message = ref('')

const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const selected = computed(() => genres.value.find((g) => g.id === selectedId.value))

const memberIds = computed(
	() => new Set(links.value.filter((l) => l.genre_id === selectedId.value).map((l) => l.recommendation_id))
)
const members = computed(() => recos.value.filter((r) => memberIds.value.has(r.id)))
const available = computed(() => {
	const q = norm(pickSearch.value.trim())
	return recos.value.filter(
		(r) => !memberIds.value.has(r.id) && (!q || norm(r.title).includes(q) || norm(r.artist).includes(q))
	)
})

async function loadGenres() {
	const { data, error } = await supabase.from('genres').select('*')
	if (error) { message.value = error.message; return }
	genres.value = data.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
	if (!genres.value.some((g) => g.id === selectedId.value)) {
		selectedId.value = genres.value[0]?.id ?? null
	}
}

async function loadRecosAndLinks() {
	const [r, l] = await Promise.all([
		supabase.from('recommendations').select('id, title, artist, cover_url').order('title'),
		supabase.from('recommendation_genres').select('recommendation_id, genre_id'),
	])
	if (r.error || l.error) { message.value = (r.error || l.error).message; return }
	recos.value = r.data
	links.value = l.data
}

watch(open, (isOpen) => {
	if (!isOpen) return
	message.value = ''
	renaming.value = false
	picking.value = false
	pickSearch.value = ''
	loadGenres()
	loadRecosAndLinks()
})

function select(id) {
	selectedId.value = id
	renaming.value = false
	picking.value = false
	pickSearch.value = ''
	message.value = ''
}

async function addGenre() {
	const name = newName.value.trim()
	if (!name) return
	message.value = ''
	const { data, error } = await supabase.from('genres').insert({ name }).select().single()
	if (error) {
		message.value = error.code === '23505' ? 'Ce style existe déjà' : error.message
		return
	}
	newName.value = ''
	await loadGenres()
	select(data.id)
	emit('changed')
}

function startRename() {
	renameValue.value = selected.value.name
	renaming.value = true
}

async function saveRename() {
	const name = renameValue.value.trim()
	if (!name) return
	message.value = ''
	const { data, error } = await supabase
		.from('genres')
		.update({ name })
		.eq('id', selectedId.value)
		.select()
	if (error) {
		message.value = error.code === '23505' ? 'Ce style existe déjà' : error.message
		return
	}
	if (!data.length) { message.value = 'Modification refusée (vérifie les règles RLS)'; return }
	renaming.value = false
	await loadGenres()
	emit('changed')
}

async function removeGenre() {
	if (!confirm(`Supprimer le style "${selected.value.name}" ? Les recos ne seront pas supprimées.`)) return
	message.value = ''
	const id = selectedId.value
	const { data, error } = await supabase.from('genres').delete().eq('id', id).select()
	if (error) { message.value = error.message; return }
	if (!data.length) { message.value = 'Suppression refusée (vérifie les règles RLS)'; return }
	links.value = links.value.filter((l) => l.genre_id !== id)
	await loadGenres()
	emit('changed')
}

async function addReco(r) {
	message.value = ''
	const row = { recommendation_id: r.id, genre_id: selectedId.value }
	const { error } = await supabase.from('recommendation_genres').insert(row)
	if (error) { message.value = error.message; return }
	links.value.push(row)
	emit('changed')
}

async function removeReco(r) {
	message.value = ''
	const { data, error } = await supabase
		.from('recommendation_genres')
		.delete()
		.eq('recommendation_id', r.id)
		.eq('genre_id', selectedId.value)
		.select()
	if (error) { message.value = error.message; return }
	if (!data.length) { message.value = 'Suppression refusée (vérifie les règles RLS)'; return }
	links.value = links.value.filter(
		(l) => !(l.recommendation_id === r.id && l.genre_id === selectedId.value)
	)
	emit('changed')
}
</script>

<template>
	<UModal v-model:open="open" title="Gérer les styles" description="Créer, renommer et supprimer les styles"
		:ui="{ content: 'max-w-5xl' }">
		<template #body>
			<div class="flex gap-4 min-h-96">
				<aside class="w-[15%] min-w-44 flex flex-col gap-1 border-r border-default pr-4">
					<div class="flex gap-1 mb-2">
						<UInput v-model="newName" placeholder="Nouveau style" size="sm" class="flex-1"
							@keyup.enter="addGenre" />
						<UButton icon="i-lucide-plus" size="sm" aria-label="Ajouter le style" @click="addGenre" />
					</div>

					<button v-for="g in genres" :key="g.id" class="p-2 rounded-lg text-left truncate hover:bg-elevated"
						:class="g.id === selectedId ? 'bg-elevated text-highlighted' : 'text-muted'"
						@click="select(g.id)">
						{{ g.name }}
					</button>

					<p v-if="!genres.length" class="text-sm text-muted">Aucun style pour l'instant.</p>
				</aside>

				<section class="flex-1 min-w-0">
					<template v-if="selected">
						<div class="flex items-center justify-between gap-2 mb-4">
							<div v-if="renaming" class="flex gap-2 flex-1">
								<UInput v-model="renameValue" class="flex-1" @keyup.enter="saveRename"
									@keyup.escape="renaming = false" />
								<UButton label="OK" @click="saveRename" />
								<UButton label="Annuler" color="neutral" variant="subtle" @click="renaming = false" />
							</div>
							<template v-else>
								<h3 class="truncate">{{ selected.name }}</h3>
								<div class="flex gap-2">
									<UButton label="Renommer" color="neutral" variant="subtle" @click="startRename" />
									<UButton label="Supprimer" color="error" variant="subtle" @click="removeGenre" />
								</div>
							</template>
						</div>

						<div class="flex items-center justify-between mb-2">
							<p class="text-muted">{{ members.length }} musique{{ members.length > 1 ? 's' : '' }}</p>
							<UButton :label="picking ? 'Fermer' : 'Associer des musiques'"
								:icon="picking ? 'i-lucide-x' : 'i-lucide-plus'" color="neutral" variant="subtle"
								@click="picking = !picking" class="btn-add-music"/>
						</div>

						<div v-if="picking" class="mb-4 p-3 rounded-lg border border-default">
							<UInput v-model="pickSearch" icon="i-lucide-search" placeholder="Titre ou artiste"
								class="w-full mb-2" />
							<div class="max-h-60 overflow-y-auto flex flex-col gap-1">
								<button v-for="r in available" :key="r.id"
									class="flex w-full items-center gap-3 p-2 rounded-lg text-left hover:bg-elevated"
									@click="addReco(r)">
									<img v-if="r.cover_url" :src="r.cover_url" :alt="r.title"
										class="size-10 rounded object-cover" />
									<div class="flex-1 min-w-0">
										<p class="truncate">{{ r.title }}</p>
										<p class="truncate text-sm text-muted">{{ r.artist }}</p>
									</div>
									<UIcon name="i-lucide-plus" class="size-5 text-primary" />
								</button>
								<p v-if="!available.length" class="text-sm text-muted p-2">Aucune musique à ajouter.</p>
							</div>
						</div>

						<div class="max-h-96 overflow-y-auto flex flex-col gap-1">
							<div v-for="r in members" :key="r.id" class="flex items-center gap-3 p-2 rounded-lg hover:bg-elevated">
								<img v-if="r.cover_url" :src="r.cover_url" :alt="r.title"
									class="size-10 rounded object-cover" />
								<div class="flex-1 min-w-0">
									<p class="truncate">{{ r.title }}</p>
									<p class="truncate text-sm text-muted">{{ r.artist }}</p>
								</div>
								<UButton icon="i-lucide-x" color="neutral" variant="ghost"
									aria-label="Retirer du style" @click="removeReco(r)" />
							</div>
						</div>
					</template>
					<p v-else class="text-muted">Crée ton premier style avec le champ à gauche.</p>
					<p v-if="message" class="mt-4 text-error">{{ message }}</p>
				</section>
			</div>
		</template>
	</UModal>
</template>

<style scoped>
.btn-add-music {
	font-size: small;
}
</style>