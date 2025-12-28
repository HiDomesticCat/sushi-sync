<script lang="ts">
  import '../app.css';
  import LoadingOverlay from '../components/ui/LoadingOverlay.svelte';
</script>

<slot />

<LoadingOverlay />
