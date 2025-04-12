</main>
</div>

<script src="/public/src/main.js"></script>
<script>
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("Service Worker registered"))
      .catch((err) => console.error("Service Worker registration failed", err));
  }
</script>
</body>
</html>