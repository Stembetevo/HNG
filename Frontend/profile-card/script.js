const timeElement = document.querySelector('[data-testid="test-user-time"]');
const avatarElement = document.querySelector('[data-testid="test-user-avatar"]');
const avatarUrlInput = document.querySelector('[data-testid="test-avatar-url-input"]');
const avatarFileInput = document.querySelector('[data-testid="test-avatar-file-input"]');
const applyAvatarButton = document.querySelector('[data-testid="test-avatar-apply-button"]');

function updateEpochTime() {
  timeElement.textContent = String(Date.now());
}

function applyAvatarUrl(urlValue) {
  if (!urlValue) {
    return;
  }

  avatarElement.src = urlValue;
}

applyAvatarButton.addEventListener('click', () => {
  applyAvatarUrl(avatarUrlInput.value.trim());
});

avatarUrlInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    applyAvatarUrl(avatarUrlInput.value.trim());
  }
});

avatarFileInput.addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];

  if (!file) {
    return;
  }

  const fileReader = new FileReader();
  fileReader.onload = () => {
    const fileResult = typeof fileReader.result === 'string' ? fileReader.result : '';
    applyAvatarUrl(fileResult);
  };
  fileReader.readAsDataURL(file);
});

updateEpochTime();
window.setInterval(updateEpochTime, 1000);
