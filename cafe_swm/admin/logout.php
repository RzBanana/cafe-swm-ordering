<?php
require_once __DIR__ . '/../includes/auth.php';
do_logout();
redirect(BASE_URL . '/admin/login.php');
