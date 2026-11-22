(function () {
  var root = document.documentElement;
  var choice = null;
  var signedIn = false;
  try {
    choice = localStorage.getItem('messenger:theme');
    signedIn = localStorage.getItem('had_session') === '1';
  } catch (error) {
    choice = null;
  }
  var dark = choice === 'dark' || (choice !== 'light' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  if (signedIn) root.setAttribute('data-boot', 'app');
})();
