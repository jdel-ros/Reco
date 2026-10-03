<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = ref({ title: '', artist: '', description: '', type: 'track', player_url: '' })
const file = ref(null)
const message = ref('')

function onFile(e) {
  file.value = e.target.files[0] ?? null
}

async function save() {
  message.value = ''
  let cover_url = null

  if (file.value) {
    const ext = file.value.name.split('.').pop()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('covers').upload(path, file.value)
    if (error) { message.value = error.message; return }
    cover_url = supabase.storage.from('covers').getPublicUrl(path).data.publicUrl
  }

  const { error } = await supabase.from('recommendations').insert({ ...form.value, cover_url })
  if (error) { message.value = error.message; return }

  message.value = 'Reco ajoutée ✅'
  form.value = { title: '', artist: '', description: '', type: 'track', player_url: '' }
  file.value = null
}

async function logout() {
  await auth.logout()
  router.push({ name: 'admin-login' })
}
</script>

<template>
  <div>
    <h1>Ajouter une reco</h1>
    <input v-model="form.title" placeholder="Titre" />
    <input v-model="form.artist" placeholder="Artiste" />
    <textarea v-model="form.description" placeholder="Description"></textarea>
    <select v-model="form.type">
      <option value="track">Titre</option>
      <option value="album">Album</option>
      <option value="playlist">Playlist</option>
    </select>
    <input v-model="form.player_url" placeholder="Lien Spotify / Deezer / Apple Music" />
    <input type="file" accept="image/*" @change="onFile" />
    <button @click="save">Publier</button>
    <button @click="logout">Déconnexion</button>
    <p>{{ message }}</p>
  </div>
</template>