const getUser = () => {
  // work with localStorage
  const user = localStorage.getItem("mb-user");
  const token = localStorage.getItem("mb-token");

  return { user, token };
};

const setUser = (user, token) => {
  localStorage.setItem("mb-user", user);
  localStorage.setItem("mb-token", token);
};

const getTodos = (data) => {
  return fetch("https://new.theminibase.com/getTodos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, user: getUser() }),
  }).then((res) => res.json());
};
