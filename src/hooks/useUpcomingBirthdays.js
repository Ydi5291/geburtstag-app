import { useMemo } from 'react';

export function useUpcomingBirthdays(birthdays) {
  const upcomingBirthdays = useMemo(() => {
    // Utiliser la date locale sans timezone
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    
    // Créer une date "propre" pour aujourd'hui (sans heure)
    const todayClean = new Date(currentYear, currentMonth, currentDay);
    
    const results = birthdays.map(birthday => {
      // Gérer différents formats de date
      let birthDate;
      if (typeof birthday.date === 'string') {
        // Format YYYY-MM-DD depuis Firebase
        const parts = birthday.date.split('-');
        birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        birthDate = new Date(birthday.date);
      }
      
      // Calculer la prochaine occurrence de l'anniversaire cette année
      const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
      
      // Si l'anniversaire de cette année est déjà passé, prendre celui de l'année prochaine
      let nextBirthday;
      if (thisYearBirthday < todayClean) {
        nextBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
      } else {
        nextBirthday = thisYearBirthday;
      }
      
      // Calculer les jours restants
      const diffTime = nextBirthday.getTime() - todayClean.getTime();
      const daysRemaining = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Déterminer le type de notification
      let notificationType = null;
      let priority = 0;
      
      if (daysRemaining === 0) {
        notificationType = 'today';
        priority = 3;
      } else if (daysRemaining === 1) {
        notificationType = 'tomorrow';
        priority = 3;
      } else if (daysRemaining === 2) {
        notificationType = 'twoDays';
        priority = 2;
      } else if (daysRemaining === 7) {
        notificationType = 'oneWeek';
        priority = 1;
      }
      
      const isUpcoming = daysRemaining >= 0 && daysRemaining <= 7;
      
      return {
        ...birthday,
        daysRemaining,
        nextBirthday,
        notificationType,
        priority,
        isUpcoming
      };
    })
    .filter(birthday => birthday.isUpcoming)
    .sort((a, b) => a.daysRemaining - b.daysRemaining || b.priority - a.priority);
    
    return results;
  }, [birthdays]);

  return upcomingBirthdays;
}

export function getNotificationMessage(birthday) {
  const { firstName, lastName, daysRemaining, notificationType } = birthday;
  const fullName = `${firstName} ${lastName}`;
  
  switch (notificationType) {
    case 'today':
      return `🎉 Heute ist ${fullName}s Geburtstag!`;
    case 'tomorrow':
      return `🎂 Morgen ist ${fullName}s Geburtstag!`;
    case 'twoDays':
      return `⚠️ In 2 Tagen ist ${fullName}s Geburtstag!`;
    case 'oneWeek':
      return `🔔 In einer Woche ist ${fullName}s Geburtstag!`;
    default:
      return `📅 In ${daysRemaining} Tagen ist ${fullName}s Geburtstag`;
  }
}
