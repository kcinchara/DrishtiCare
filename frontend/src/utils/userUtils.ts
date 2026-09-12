export interface UserProfile {
  id?: number;
  full_name?: string;
  username?: string;
  email?: string;
  role?: string;
}

export const formatUserGreeting = (user: UserProfile | null) => {
  if (!user) {
    return {
      name: 'Healthcare Worker',
      greeting: 'Welcome, Healthcare Worker 👋',
      role: 'Hospital Worker / Healthcare Worker'
    };
  }

  const rawName = (user.full_name || user.username || 'Healthcare Worker').trim();
  const rawRole = user.role || 'Hospital Worker / Healthcare Worker';

  // Standardize role label
  let displayRole = rawRole;
  if (rawRole === 'DOCTOR') {
    displayRole = 'Doctor';
  } else if (rawRole === 'HEALTHCARE_WORKER') {
    displayRole = 'Hospital Worker / Healthcare Worker';
  }

  // Format greeting name: If Doctor, ensure Dr. prefix
  let formattedName = rawName;
  if (displayRole === 'Doctor') {
    if (!formattedName.toLowerCase().startsWith('dr.') && !formattedName.toLowerCase().startsWith('dr ')) {
      formattedName = `Dr. ${formattedName}`;
    }
  }

  return {
    name: formattedName,
    greeting: `Welcome, ${formattedName} 👋`,
    role: displayRole
  };
};
