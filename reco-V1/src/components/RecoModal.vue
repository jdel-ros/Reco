<script setup>
import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { coverPath } from '@/lib/covers'

const props = defineProps({ reco: Object })
const emit = defineEmits(['saved'])
const open = defineModel('open')

const emptyForm = () => ({ title: '', artist: '', description: '', type: 'track', spotify_url: '', deezer_url: '', apple_url: '' })
const itemsType = [
	{ label: 'Musique', value: 'track' },
	{ label: 'Album', value: 'album' },
	{ label: 'Playlist', value: 'playlist' },
]

const form = ref(emptyForm())
const file = ref(null)
const currentCover = ref(null)
const message = ref('')
const saving = ref(false)

watch(open, (isOpen) => {
	if (!isOpen) return
	message.value = ''
	file.value = null
	if (props.reco) {
		const r = props.reco
		form.value = {
			title: r.title,
			artist: r.artist,
			description: r.description ?? '',
			type: r.type,
			spotify_url: r.spotify_url ?? '',
			deezer_url: r.deezer_url ?? '',
			apple_url: r.apple_url ?? '',
		}
		currentCover.value = r.cover_url
	} else {
		form.value = emptyForm()
		currentCover.value = null
	}
})

async function uploadCover() {
	const ext = file.value.name.split('.').pop()
	const path = `${crypto.randomUUID()}.${ext}`
	const { error } = await supabase.storage.from('covers').upload(path, file.value)
	if (error) throw error
	return supabase.storage.from('covers').getPublicUrl(path).data.publicUrl
}

async function save() {
	message.value = ''
	saving.value = true
	try {
		let cover_url = currentCover.value

		if (file.value) {
			const oldPath = coverPath(currentCover.value)
			cover_url = await uploadCover()
			if (oldPath) await supabase.storage.from('covers').remove([oldPath])
		}

		if (props.reco) {
			const { data, error } = await supabase
				.from('recommendations')
				.update({ ...form.value, cover_url })
				.eq('id', props.reco.id)
				.select()
			if (error) throw error
			if (!data.length) throw new Error('Modification refusée (vérifie les règles RLS)')
		} else {
			const { error } = await supabase.from('recommendations').insert({ ...form.value, cover_url })
			if (error) throw error
		}

		open.value = false
		emit('saved')
	} catch (e) {
		message.value = e.message
	} finally {
		saving.value = false
	}
}
</script>

<template>
	<UModal v-model:open="open" :dismissible="!saving" :ui="{ content: 'max-w-3xl' }">
		<template #content>
			<div class="div-add">
				<FloatInput v-model="form.title" label="Titre" class="input" size="md" />
				<FloatInput v-model="form.artist" label="Artiste" class="input" size="md" />
				<FloatTextArea v-model="form.description" label="Description" class="input input-area" size="md" />
				<USelect v-model="form.type" :items="itemsType" size="md" />
				<FloatInput v-model="form.spotify_url" label="Lien Spotify" class="input input-link" size="md" />
				<FloatInput v-model="form.deezer_url" label="Lien Deezer" class="input" size="md" />
				<FloatInput v-model="form.apple_url" label="Lien Apple Music" class="input" size="md" />
				<div class="div-cover">
					<img v-if="currentCover" :src="currentCover" alt="cover actuelle" width="80" class="cover" />
					<UFileUpload v-model="file" variant="button" accept="image/*" class="w-1/3" />
				</div>

				<div class="flex gap-2 mt-4 div-btn">
					<UButton label="Annuler" color="neutral" variant="subtle" :disabled="saving" @click="open = false" />
					<UButton :label="reco ? 'Enregistrer' : 'Publier'" :loading="saving" @click="save" />
				</div>
				<p>{{ message }}</p>
			</div>
		</template>
	</UModal>
</template>

<style scoped>
.cover {
	margin-right: 1em;
}
.div-cover {
	display: inline-flex;
	justify-content: center;
	max-width: 100%;
}
.div-add {
	padding: 2em 1em 2em 1em;
	display: grid;
	grid-template-columns: 1fr;
	width: 80%;
	margin: 0 auto;
}
.input {
	max-width: 100%;
	margin-bottom: 0.6em;
}
.input-link {
	margin-top: 0.6em;
}
.div-btn {
	justify-content: center;
	align-items: center;
}
</style>