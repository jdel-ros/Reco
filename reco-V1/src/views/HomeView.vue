<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

const recos = ref([])

onMounted(async () => {
    const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .order('published_at', { ascending: false })
    if (!error) recos.value = data
})

function embedUrl(url) {
    if (!url) return null
    const spotify = url.match(
        /open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist)\/([A-Za-z0-9]+)/,
    )
    if (spotify) return `https://open.spotify.com/embed/${spotify[1]}/${spotify[2]}`
    return null
}
</script>

<template>
    <div v-for="reco in recos" :key="reco.id">
        <img v-if="reco.cover_url" :src="reco.cover_url" :alt="reco.title" />
        <h2>{{ reco.title }}</h2>
        <p>{{ reco.artist }}</p>
        <p>{{ reco.description }}</p>
        <iframe
            v-if="embedUrl(reco.player_url)"
            :src="embedUrl(reco.player_url)"
            width="100%"
            height="152"
            frameborder="0"
            allow="encrypted-media"
            loading="lazy"
        ></iframe>
    </div>
</template>
