import React, { useEffect, useState } from 'react';
import { getNotificationMessage } from '../hooks/useUpcomingBirthdays';
import '../styles/BirthdayNotifications.css';

function BirthdayNotifications({ upcomingBirthdays, onRequestPermission }) {
  const [showWebNotifications, setShowWebNotifications] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  useEffect(() => {
    // Vérifier la permission des notifications au chargement
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    // Afficher les notifications web pour les anniversaires critiques (aujourd'hui et demain)
    if (notificationPermission === 'granted' && upcomingBirthdays.length > 0) {
      const criticalBirthdays = upcomingBirthdays.filter(
        b => b.notificationType === 'today' || b.notificationType === 'tomorrow'
      );

      criticalBirthdays.forEach(birthday => {
        const message = getNotificationMessage(birthday);
        new Notification('Geburtstag Erinnerung', {
          body: message,
          icon: '/favicon.ico',
          tag: `birthday-${birthday.id}`, // Éviter les doublons
        });
      });
    }
  }, [upcomingBirthdays, notificationPermission]);

  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setShowWebNotifications(true);
        setTimeout(() => setShowWebNotifications(false), 3000);
      }
    }
  };

  const getNotificationStyle = (notificationType) => {
    switch (notificationType) {
      case 'today':
        return 'notification-today';
      case 'tomorrow':
        return 'notification-tomorrow';
      case 'twoDays':
        return 'notification-two-days';
      case 'oneWeek':
        return 'notification-one-week';
      default:
        return 'notification-default';
    }
  };

  if (upcomingBirthdays.length === 0) {
    return null;
  }

  return (
    <div className="birthday-notifications">
      <div className="notifications-header">
        <h4>
          🔔 Kommende Geburtstage
          {upcomingBirthdays.length > 0 && (
            <span className="notification-badge">{upcomingBirthdays.length}</span>
          )}
        </h4>
        {notificationPermission === 'default' && (
          <button 
            className="notification-permission-btn"
            onClick={requestNotificationPermission}
            title="Browser-Benachrichtigungen aktivieren"
          >
            🔔 Benachrichtigungen
          </button>
        )}
      </div>

      {showWebNotifications && (
        <div className="notification-success">
          ✅ Browser-Benachrichtigungen aktiviert!
        </div>
      )}

      <div className="notifications-list">
        {upcomingBirthdays.map(birthday => (
          <div 
            key={birthday.id} 
            className={`notification-item ${getNotificationStyle(birthday.notificationType)}`}
          >
            <div className="notification-content">
              <span className="notification-message">
                {getNotificationMessage(birthday)}
              </span>
              <span className="notification-date">
                {birthday.nextBirthday.toLocaleDateString('de-DE', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BirthdayNotifications;
