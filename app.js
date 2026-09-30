const SUPABASE_URL = "https://iixzhhdgdmzzlbvdaepv.supabase.co";
const SUPABASE_KEY = "sb_publishable_ow7orC7jKGmYsYbLP0EddA_Teu4Nx0N";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// -----------------------------
// AUTH ELEMENTS
// -----------------------------

const authScreen = document.getElementById("authScreen");
const app = document.getElementById("app");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");

const signupName = document.getElementById("signupName");
const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");

const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");

const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");

const authMessage = document.getElementById("authMessage");

let currentUser = null;
let messageChannel = null;


// -----------------------------
// SWITCH LOGIN / SIGNUP
// -----------------------------

showSignup.addEventListener("click", () => {
  loginForm.classList.add("hidden");
  signupForm.classList.remove("hidden");
  authMessage.textContent = "";
});

showLogin.addEventListener("click", () => {
  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  authMessage.textContent = "";
});


// -----------------------------
// HELPERS
// -----------------------------

function showMessage(message) {
  authMessage.textContent = message;
}

function cleanUsername(username) {
  return username
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
// -----------------------------
// SIGN UP
// -----------------------------

signupButton.addEventListener("click", async () => {
  const name = signupName.value.trim();
  const email = signupEmail.value.trim().toLowerCase();
  const username = cleanUsername(signupUsername.value);
  const password = signupPassword.value;

  if (!name || !email || !username || !password) {
    showMessage("Please fill in everything.");
    return;
  }

  if (username.length < 3) {
    showMessage("Username must be at least 3 characters.");
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.");
    return;
  }

  signupButton.disabled = true;
  signupButton.textContent = "Creating...";

  try {
    // Check username
    const { data: existingUser, error: usernameError } =
      await supabaseClient
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

    if (usernameError) {
      throw usernameError;
    }

    if (existingUser) {
      showMessage("That username is already taken.");
      return;
    }

    // Create real email account
    // The Supabase trigger automatically creates the profile.
    const { data, error } =
      await supabaseClient.auth.signUp({
        email: email,
        password: password,

        options: {
          data: {
            username: username,
            display_name: name
          }
        }
      });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("Account could not be created.");
    }

    // Email confirmation is ON
    if (!data.session) {
      showMessage(
        "Account created! Check your email to verify your account. 💌"
      );
      return;
    }

    // If confirmation is disabled later,
    // the user can enter the app immediately.
    showMessage("Account created! 💜");

    setTimeout(() => {
      showApp();
    }, 700);

  } catch (error) {
    console.error("Signup error:", error);
    showMessage(error.message || "Something went wrong.");
  } finally {
    signupButton.disabled = false;
    signupButton.textContent = "Create account";
  }
});

// -----------------------------
// LOGIN
// -----------------------------

loginButton.addEventListener("click", async () => {

  const loginValue = loginUsername.value.trim();
  const password = loginPassword.value;

  if (!loginValue || !password) {
    showMessage("Enter your email/username and password.");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  try {

    let emailToUse = loginValue.toLowerCase();


    // If they entered a username instead of an email,
    // find the account's email.
    if (!loginValue.includes("@")) {

      const username = cleanUsername(loginValue);

      const { data: profile, error: profileError } =
        await supabaseClient
          .from("profiles")
          .select("id, username")
          .eq("username", username)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        showMessage("Username not found.");
        return;
      }

      // OLD accounts still use the old internal email.
      emailToUse = `${username}@chatapp.local`;
    }


    const { error } =
      await supabaseClient.auth.signInWithPassword({
        email: emailToUse,
        password: password
      });

    if (error) {
      throw error;
    }

    await showApp();

  } catch (error) {
    console.error("Login error:", error);

    if (
      error.message &&
      error.message.toLowerCase().includes("email not confirmed")
    ) {
      showMessage("Please verify your email first. 💌");
    } else {
      showMessage("Incorrect email/username or password.");
    }

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Log in";
  }
});


// -----------------------------
// SHOW APP
// -----------------------------

async function showApp() {

  authScreen.style.display = "none";
  app.style.display = "grid";

  await loadCurrentUser();
  await loadRecentChats();
}
async function showApp() {
  authScreen.style.display = "none";
  app.style.display = "grid";

  await loadCurrentUser();

  await updateMyPresence(true);

  await loadRecentChats();
}

// -----------------------------
// CHECK EXISTING SESSION
// -----------------------------

async function checkSession() {

  const { data } =
    await supabaseClient.auth.getSession();

  if (data.session) {
    await showApp();
  } else {
    authScreen.style.display = "flex";
    app.style.display = "none";
  }
}


// -----------------------------
// LOAD CURRENT USER
// -----------------------------
async function loadCurrentUser() {

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return;
  }

  const { data: profile, error } =
    await supabaseClient
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, bio"
      )
      .eq("id", user.id)
      .single();

  if (error) {

    console.error(
      "Could not load profile:",
      error
    );

    return;
  }

  currentUser = profile;


  // LEFT SIDEBAR PROFILE

  document.getElementById(
    "myDisplayName"
  ).textContent =
    currentUser.display_name || "Your Name";


  document.getElementById(
    "myUsername"
  ).textContent =
    "@" + currentUser.username;


  document.getElementById(
    "myAvatar"
  ).textContent =
    currentUser.display_name
      ? currentUser.display_name
          .charAt(0)
          .toUpperCase()
      : "?";


  // RIGHT COLUMN PROFILE

  document.getElementById(
    "myDetailsName"
  ).textContent =
    currentUser.display_name || "Your Name";


  document.getElementById(
    "myDetailsUsername"
  ).textContent =
    "@" + currentUser.username;


  document.getElementById(
    "myDetailsBio"
  ).textContent =
    currentUser.bio || "No bio yet.";


  document.getElementById(
    "myDetailsAvatar"
  ).textContent =
    currentUser.display_name
      ? currentUser.display_name
          .charAt(0)
          .toUpperCase()
      : "?";


  console.log(
    "Logged in as:",
    currentUser
  );
}
// -----------------------------
// LOGOUT
// -----------------------------

async function logout() {

  await supabaseClient.auth.signOut();

  location.reload();
}


// -----------------------------
// NEW CHAT MODAL
// -----------------------------

const newChatBtn =
  document.getElementById("newChatBtn");

const newChatModal =
  document.getElementById("newChatModal");

const closeNewChat =
  document.getElementById("closeNewChat");


newChatBtn.addEventListener("click", () => {

  newChatModal.classList.remove("hidden");

});


closeNewChat.addEventListener("click", () => {

  newChatModal.classList.add("hidden");

});


newChatModal.addEventListener(
  "click",
  (event) => {

    if (event.target === newChatModal) {
      newChatModal.classList.add("hidden");
    }

  }
);


// -----------------------------
// USER SEARCH
// -----------------------------

const userSearchInput =
  document.getElementById("userSearchInput");

const userSearchResults =
  document.getElementById("userSearchResults");


userSearchInput.addEventListener(
  "input",
  async () => {

    const username =
      cleanUsername(
        userSearchInput.value
      );


    if (!username) {

      userSearchResults.innerHTML = "";

      return;
    }


    const { data, error } =
      await supabaseClient
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url"
        )
        .ilike(
          "username",
          `${username}%`
        )
        .limit(10);


    if (error) {

      console.error(
        "User search error:",
        error
      );

      userSearchResults.innerHTML =
        "<p>Could not search users.</p>";

      return;
    }


    const filteredUsers =
      data.filter(
        profile =>
          currentUser &&
          profile.id !== currentUser.id
      );


    if (!filteredUsers.length) {

      userSearchResults.innerHTML =
        "<p>No users found.</p>";

      return;
    }


    userSearchResults.innerHTML =
      filteredUsers
        .map(
          profile => `

          <button
            type="button"
            class="user-result"
            data-user-id="${profile.id}"
          >

            <span class="user-result-avatar">
              ${escapeHtml(
                profile.display_name
                  .charAt(0)
                  .toUpperCase()
              )}
            </span>

            <span>

              <strong>
                ${escapeHtml(
                  profile.display_name
                )}
              </strong>

              <small>
                @${escapeHtml(
                  profile.username
                )}
              </small>

            </span>

          </button>

        `
        )
        .join("");
  }
);


// -----------------------------
// SELECT USER FROM SEARCH
// -----------------------------

userSearchResults.addEventListener(
  "click",
  async (event) => {

    const result =
      event.target.closest(
        ".user-result"
      );

    if (!result) return;


    const otherUserId =
      result.dataset.userId;


    console.log(
      "Starting chat with:",
      otherUserId
    );


    newChatModal.classList.add(
      "hidden"
    );

    userSearchInput.value = "";

    userSearchResults.innerHTML = "";


    await startConversation(
      otherUserId
    );
  }
);


// -----------------------------
// START CONVERSATION
// -----------------------------

async function startConversation(
  otherUserId
) {

  if (!currentUser) {

    console.error(
      "No logged-in user."
    );

    return;
  }


  const {
    data: conversationId,
    error
  } = await supabaseClient
    .rpc(
      "create_direct_conversation",
      {
        other_user_id:
          otherUserId
      }
    );


  if (error) {

    console.error(
      "Could not create conversation:",
      error
    );

    return;
  }


  console.log(
    "Conversation ready:",
    conversationId
  );


  await openConversation(
    conversationId,
    otherUserId
  );


  await loadRecentChats();
}


// -----------------------------
// OPEN CONVERSATION
// -----------------------------

async function openConversation(
  conversationId,
  otherUserId
) {
  // Mobile: show conversation
  document.querySelector(".sidebar")
    .classList.add("mobile-hidden");

  document.querySelector(".chat")
    .classList.add("mobile-open");
  const {
    data: otherUser,
    error
  } = await supabaseClient
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio"
    )
    .eq("id", otherUserId)
    .single();


  if (error) {

    console.error(
      "Could not load user:",
      error
    );

    return;
  }


  // -----------------------------
  // CHAT HEADER
  // -----------------------------

  document.getElementById(
    "chatName"
  ).textContent =
    otherUser.display_name;


  const { data: presence } =
  await supabaseClient
    .from("user_presence")
    .select("is_online")
    .eq("user_id", otherUser.id)
    .maybeSingle();

document.getElementById(
  "chatStatus"
).textContent =
  presence?.is_online
    ? "● Online"
    : "@" + otherUser.username;


  document.getElementById(
    "chatAvatar"
  ).textContent =
    otherUser.display_name
      ? otherUser.display_name
          .charAt(0)
          .toUpperCase()
      : "?";


  // -----------------------------
  // RIGHT COLUMN — THEIR PROFILE
  // -----------------------------

  document.getElementById(
    "myDetailsName"
  ).textContent =
    otherUser.display_name || "User";


  document.getElementById(
    "myDetailsUsername"
  ).textContent =
    "@" + otherUser.username;


  document.getElementById(
    "myDetailsBio"
  ).textContent =
    otherUser.bio || "No bio yet.";


  document.getElementById(
    "myDetailsAvatar"
  ).textContent =
    otherUser.display_name
      ? otherUser.display_name
          .charAt(0)
          .toUpperCase()
      : "?";
document.getElementById(
  "myDetailsEditBtn"
).style.display = "none";

  // -----------------------------
  // MESSAGES
  // -----------------------------

  document.getElementById(
    "messages"
  ).innerHTML = `

    <div class="empty-chat">

      <div class="empty-icon">
        💬
      </div>

      <h2>
        Start chatting
      </h2>

      <p>
        Send a message to
        @${escapeHtml(
          otherUser.username
        )}
      </p>

    </div>

  `;


  window.currentConversationId =
    conversationId;

  window.currentChatUser =
    otherUser;


  await loadMessages(
    conversationId
  );


  subscribeToMessages(
    conversationId
  );


  console.log(
    "Opened conversation:",
    conversationId
  );
}


// -----------------------------
// SEND MESSAGE
// -----------------------------

const messageForm =
  document.getElementById(
    "messageForm"
  );

const messageInput =
  document.getElementById(
    "messageInput"
  );


messageForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const text =
      messageInput.value.trim();


    if (!text) return;


    if (!window.currentConversationId) {

      console.error(
        "No conversation selected."
      );

      return;
    }


    if (!currentUser) {

      console.error(
        "No logged-in user."
      );

      return;
    }


    const { error } =
      await supabaseClient
        .from("messages")
        .insert({
          conversation_id:
            window.currentConversationId,

          sender_id:
            currentUser.id,

          body: text
        });


    if (error) {

      console.error(
        "Could not send message:",
        error
      );

      return;
    }


    messageInput.value = "";

    console.log(
      "Message sent!"
    );
  }
);


// -----------------------------
// LOAD MESSAGES
// -----------------------------

async function loadMessages(
  conversationId
) {

  const {
    data,
    error
  } = await supabaseClient
    .from("messages")
    .select(
      "id, sender_id, body, created_at"
    )
    .eq(
      "conversation_id",
      conversationId
    )
    .order(
      "created_at",
      {
        ascending: true
      }
    );


  if (error) {

    console.error(
      "Could not load messages:",
      error
    );

    return;
  }


  const messagesContainer =
    document.getElementById(
      "messages"
    );


  if (!data.length) {

    messagesContainer.innerHTML = `

      <div class="empty-chat">

        <div class="empty-icon">
          💬
        </div>

        <h2>
          Start chatting
        </h2>

        <p>
          Send the first message.
        </p>

      </div>

    `;

    return;
  }


  messagesContainer.innerHTML =
    data
      .map(message => {

        const isMine =
          message.sender_id ===
          currentUser.id;


        return `

          <div
            class="message-row ${
              isMine
                ? "mine"
                : "theirs"
            }"
          >

            <div class="message-bubble">

              <span class="message-text">
                ${escapeHtml(
                  message.body
                )}
              </span>

              <span class="message-time">

                ${new Date(
                  message.created_at
                ).toLocaleTimeString(
                  [],
                  {
                    hour: "numeric",
                    minute: "2-digit"
                  }
                )}

              </span>

            </div>

          </div>

        `;
      })
      .join("");


  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}


// -----------------------------
// REALTIME MESSAGES
// -----------------------------

function subscribeToMessages(
  conversationId
) {

  if (messageChannel) {

    supabaseClient.removeChannel(
      messageChannel
    );
  }


  messageChannel =
    supabaseClient
      .channel(
        "messages-" +
        conversationId
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter:
            "conversation_id=eq." +
            conversationId
        },
        payload => {

          const message =
            payload.new;

          addMessageToChat(
            message
          );
        }
      )
      .subscribe();


  console.log(
    "Listening for new messages..."
  );
}


// -----------------------------
// ADD REALTIME MESSAGE
// -----------------------------

function addMessageToChat(
  message
) {

  const messagesContainer =
    document.getElementById(
      "messages"
    );


  const isMine =
    message.sender_id ===
    currentUser.id;


  const messageRow =
    document.createElement(
      "div"
    );

  messageRow.className =
    `message-row ${
      isMine
        ? "mine"
        : "theirs"
    }`;


  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "message-bubble";


  const text =
    document.createElement(
      "span"
    );

  text.className =
    "message-text";

  text.textContent =
    message.body;


  const time =
    document.createElement(
      "span"
    );

  time.className =
    "message-time";

  time.textContent =
    new Date(
      message.created_at
    ).toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit"
      }
    );


  bubble.appendChild(text);

  bubble.appendChild(time);

  messageRow.appendChild(
    bubble
  );

  messagesContainer.appendChild(
    messageRow
  );


  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}


// -----------------------------
// LOAD RECENT CHATS
// -----------------------------

async function loadRecentChats() {

  if (!currentUser) return;


  const {
    data,
    error
  } = await supabaseClient
    .from("conversation_members")
    .select("conversation_id")
    .eq(
      "user_id",
      currentUser.id
    );


  if (error) {

    console.error(
      "Could not load recent chats:",
      error
    );

    return;
  }


  const chatList =
    document.getElementById(
      "chatList"
    );


  if (!data.length) {

    chatList.innerHTML = `

      <div class="no-recent">
        No recent chats yet.
      </div>

    `;

    return;
  }


  chatList.innerHTML = "";


  for (
    const conversation
    of data
  ) {

    const {
      data: members,
      error: memberError
    } = await supabaseClient
      .from("conversation_members")
      .select("user_id")
      .eq(
        "conversation_id",
        conversation.conversation_id
      );


    if (memberError) continue;


    const otherMember =
      members.find(
        member =>
          member.user_id !==
          currentUser.id
      );


    if (!otherMember) continue;


    const {
      data: profile,
      error: profileError
    } = await supabaseClient
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url"
      )
      .eq(
        "id",
        otherMember.user_id
      )
      .single();


    if (profileError) continue;


    const chatItem =
      document.createElement(
        "button"
      );


    chatItem.className =
      "recent-chat";

    chatItem.type =
      "button";


    chatItem.innerHTML = `

      <div class="recent-avatar">

        ${escapeHtml(
          profile.display_name
            .charAt(0)
            .toUpperCase()
        )}

      </div>


      <div class="recent-info">

        <strong>
          ${escapeHtml(
            profile.display_name
          )}
        </strong>

        <span>
          @${escapeHtml(
            profile.username
          )}
        </span>

      </div>

    `;


    chatItem.addEventListener(
      "click",
      () => {

        startConversation(
          profile.id
        );

      }
    );


    chatList.appendChild(
      chatItem
    );
  }
}


// -----------------------------
// START APP
// -----------------------------

checkSession();
const editProfileBtn = document.getElementById("editProfileBtn");
const editProfileModal = document.getElementById("editProfileModal");
const closeEditProfile = document.getElementById("closeEditProfile");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const editDisplayName = document.getElementById("editDisplayName");
const editBio = document.getElementById("editBio");
const editAvatarPreview = document.getElementById("editAvatarPreview");


editProfileBtn.addEventListener("click", async () => {

  if (!currentUser) {
    return;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("display_name, username, bio, avatar_url")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error("Profile load error:", error);
    showMessage("Could not load your profile.");
    return;
  }

  editDisplayName.value = profile.display_name || "";
  editBio.value = profile.bio || "";

  editAvatarPreview.textContent =
    profile.display_name
      ? profile.display_name.charAt(0).toUpperCase()
      : "?";

  editProfileModal.classList.remove("hidden");
});


closeEditProfile.addEventListener("click", () => {
  editProfileModal.classList.add("hidden");
});


saveProfileBtn.addEventListener("click", async () => {

  if (!currentUser) {
    return;
  }

  const displayName = editDisplayName.value.trim();
  const bio = editBio.value.trim();

  if (!displayName) {
    showMessage("Display name cannot be empty.");
    return;
  }

  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = "Saving...";

  try {

    const { error } = await supabaseClient
      .from("profiles")
      .update({
        display_name: displayName,
        bio: bio
      })
      .eq("id", currentUser.id);

    if (error) {
      throw error;
    }

    editProfileModal.classList.add("hidden");

    await loadCurrentUser();

    showMessage("Profile updated! 💜");

  } catch (error) {

    console.error("Profile update error:", error);
    showMessage(error.message || "Could not update profile.");

  } finally {

    saveProfileBtn.disabled = false;
    saveProfileBtn.textContent = "Save changes";

  }
});
// -----------------------------
// SEARCH RECENT CHATS
// -----------------------------

const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("input", () => {

  const searchTerm =
    searchInput.value
      .trim()
      .toLowerCase();

  const chats =
    document.querySelectorAll(".recent-chat");

  chats.forEach(chat => {

    const name =
      chat.querySelector(".recent-info strong")
        ?.textContent
        .toLowerCase() || "";

    const username =
      chat.querySelector(".recent-info span")
        ?.textContent
        .toLowerCase() || "";

    if (
      name.includes(searchTerm) ||
      username.includes(searchTerm)
    ) {

      chat.style.display = "flex";

    } else {

      chat.style.display = "none";

    }

  });

});
// -----------------------------
// BACK TO CHAT LIST
// -----------------------------

document
  .getElementById("backToChats")
  .addEventListener("click", async () => {

    // Mobile: return to chat list
    document.querySelector(".chat")
      .classList.remove("mobile-open");

    document.querySelector(".sidebar")
      .classList.remove("mobile-hidden");

    // Clear selected conversation
    window.currentConversationId = null;
    window.currentChatUser = null;

    // Reset chat header
    document.getElementById(
      "chatName"
    ).textContent = "Select a chat";

    document.getElementById(
      "chatStatus"
    ).textContent = "—";

    document.getElementById(
      "chatAvatar"
    ).textContent = "?";

    // Reset messages area
    document.getElementById(
      "messages"
    ).innerHTML = `

      <div class="empty-chat">

        <div class="empty-icon">
          💬
        </div>

        <h2>
          Your messages
        </h2>

        <p>
          Choose someone to start chatting.
        </p>

      </div>

    `;

    // Show YOUR profile again
    await loadCurrentUser();

    // Show your edit button
    document.getElementById(
      "myDetailsEditBtn"
    ).style.display = "block";

  });


document.getElementById(
  "myDetailsEditBtn"
).addEventListener("click", () => {

  document.getElementById(
    "editProfileBtn"
  ).click();

});
// -----------------------------
// USER PRESENCE
// -----------------------------

let presenceChannel = null;

async function updateMyPresence(isOnline) {

  if (!currentUser) return;

  const { error } = await supabaseClient
    .from("user_presence")
    .upsert({
      user_id: currentUser.id,
      is_online: isOnline,
      last_seen: new Date().toISOString(),
      is_typing: false,
      typing_conversation_id: null
    });

  if (error) {
    console.error(
      "Presence update error:",
      error
    );
  }
}