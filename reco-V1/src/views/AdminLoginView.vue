<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const show = ref(false)

async function submit() {
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push({ name: 'admin' })
  } catch (e) {
    error.value = 'Email ou mot de passe incorrect'
  }
}
</script>

<template>
  <div>
    <h1>Admin</h1>
    <input v-model="email" type="email" placeholder="Email" />
    <input v-model="password" type=@type placeholder="Mot de passe" @keyup.enter="submit" />
    <button @click="submit">Se connecter</button>
    <p v-if="error">{{ error }}</p>
  </div>
</template>