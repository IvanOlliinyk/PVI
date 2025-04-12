<!doctype html>
<html lang="en">
<head>
    <title>CMS</title>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/public/src/styles.css">
    <link rel="manifest" href="/public/manifest.json" />
</head>

<body class="<?php echo $currentPage ?? ''; ?>">
<header class="top_bar">
    <div class="left">
        <img src="/public/src/assets/burger.png" alt="burger menu" class="burger-btn" id="brgrbtn">
        <a href="/students" aria-label="CMS" class="title">CMS</a>
    </div>
    <div class="info">
        <div class="notification-wrapper">
            <a id="notification-btn" class="notification" aria-label="messages" href="/messages" target="_blank" onclick="updateNotification()">Messages</a>
            <div id="notifications-popup" class="popup">
                <div class="popup-content">
                    <div class="popup-body">
                        <div class="notification">
                            <div>
                                <img src="/public/src/assets/max.jpg" alt="profile">
                                <p>Max Sakh</p>
                            </div>
                            <p>Nihao padoshva</p>
                        </div>
                        <!-- інші повідомлення... -->
                    </div>
                </div>
            </div>
        </div>
        <div class="profile-wrapper">
            <button id="profile-btn" class="user">Profile</button>
            <div id="profile-popup" class="popup">
                <button>Profile</button>
                <button>Logout</button>
            </div>
        </div>
        <span class="username">Ivan Oliinyk</span>
    </div>
</header>

<nav class="burger">
    <a href="/dashboard" <?php echo $currentPage == 'dashboard' ? 'class="current"' : ''; ?>>Dashboard</a>
    <a href="/students" <?php echo $currentPage == 'students' ? 'class="current"' : ''; ?>>Students</a>
    <a href="/tasks" <?php echo $currentPage == 'tasks' ? 'class="current"' : ''; ?>>Tasks</a>
</nav>

<div class="content-wrapper">

    <nav class="side_bar">
        <a href="/dashboard" <?php echo $currentPage == 'dashboard' ? 'class="current"' : ''; ?>>Dashboard</a>
        <a href="/students" <?php echo $currentPage == 'students' ? 'class="current"' : ''; ?>>Students</a>
        <a href="/tasks" <?php echo $currentPage == 'tasks' ? 'class="current"' : ''; ?>>Tasks</a>
    </nav>

    <main class="content">