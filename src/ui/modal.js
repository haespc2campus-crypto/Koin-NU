import MicroModal from "micromodal";

let ready = false;

export function initModals() {
  if (ready) return;
  MicroModal.init({
    awaitCloseAnimation: true,
    disableScroll: true,
    disableFocus: false
  });
  ready = true;
}

export function openModal(id) {
  initModals();
  MicroModal.show(id);
}

export function closeModal(id) {
  MicroModal.close(id);
}
