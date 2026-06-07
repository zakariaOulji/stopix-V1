import type { AppNotification } from '@/types';

export const notificationsMock: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Nouvelle tournée assignée',
    message: 'Tournée Paris 20e prévue demain à 14:00.',
    type: 'info',
    read: false,
    createdAt: '2026-06-03T08:12:00Z',
  },
  {
    id: 'notif-2',
    title: 'Objectif atteint 🎉',
    message: 'Vous avez dépassé 90% de taux de succès cette semaine.',
    type: 'success',
    read: false,
    createdAt: '2026-06-03T07:40:00Z',
  },
  {
    id: 'notif-3',
    title: 'Colis en attente',
    message: 'Le stop "42 Rue Oberkampf" a échoué (destinataire absent).',
    type: 'warning',
    read: true,
    createdAt: '2026-06-02T16:05:00Z',
  },
];
