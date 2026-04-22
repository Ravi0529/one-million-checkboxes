const getUserId = () => {
  let id = localStorage.getItem("userId");

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("userId", id);
  }

  return id;
};

export const userId = getUserId();
