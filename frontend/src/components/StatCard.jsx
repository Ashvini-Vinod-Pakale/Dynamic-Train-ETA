function StatCard({
  icon: Icon,
  label,
  value,
  description,
  cardClass,
}) {
  return (
    <div className={`insight-card ${cardClass}`}>

      <div className="insight-icon">
        <Icon size={25} />
      </div>

      <div>
        <span>{label}</span>

        <h3>{value}</h3>

        <p>{description}</p>
      </div>

    </div>
  );
}

export default StatCard;