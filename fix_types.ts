// Este é o tipo que precisamos usar:
type NotificationType = {
  title: string;
  message: string;
  [key: string]: any;
};

// Antes:
const notificationExists = existingNotifications.some(n => 
  n.title === data.notification.forParticipant.title && 
  n.message === data.notification.forParticipant.message
);

// Depois:
const notificationExists = existingNotifications.some((n: NotificationType) => 
  n.title === data.notification.forParticipant.title && 
  n.message === data.notification.forParticipant.message
);