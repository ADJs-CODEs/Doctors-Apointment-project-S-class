export const getDoseStatus = (med: any) => {
  if (!med.lastTaken) return { isEarly: false, hoursLeft: "0" };
  const gap = med.frequencyType === 'daily' ? (24 / (med.dosagePerDay || 1)) : (med.dosagePerDay || 4);
  const now = new Date().getTime();
  const last = new Date(med.lastTaken).getTime();
  const diffHours = (now - last) / (1000 * 60 * 60);
  return {
    isEarly: diffHours < gap,
    hoursLeft: Math.max(0, gap - diffHours).toFixed(1)
  };
};

export const getAdherenceStats = (med: any) => {
  const total = med.totalQuantity || 1;
  const remaining = med.remainingQuantity ?? total;
  const rate = Math.min(100, Math.round(((total - remaining) / total) * 100));
  return { rate };
};

export const slotDateFormat = (slotDate: string) => {
  const dateArray = slotDate.split('_');
  return `${dateArray[0]} ${dateArray[1]} ${dateArray[2]}`;
};