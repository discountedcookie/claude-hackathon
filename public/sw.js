self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Plus One", {
      body: data.body ?? "",
      icon: "/icon-192.png",
    }),
  );
});
