<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo"></div>
        <span class="title">TraceNote</span>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section">Navigation</div>
        <router-link to="/" class="nav-item" exact-active-class="active">
          <span class="nav-icon">◉</span>
          Sessions
        </router-link>
        <router-link to="/timeline" class="nav-item" active-class="active">
          <span class="nav-icon">◈</span>
          Timeline
        </router-link>
        <router-link to="/analytics" class="nav-item" active-class="active">
          <span class="nav-icon">◎</span>
          Analytics
        </router-link>
        <div class="nav-section">Tools</div>
        <router-link to="/import" class="nav-item" active-class="active">
          <span class="nav-icon">↩</span>
          Import / Export
        </router-link>
        <router-link to="/settings" class="nav-item" active-class="active">
          <span class="nav-icon">⚙</span>
          Settings
        </router-link>
      </nav>
    </aside>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
</script>