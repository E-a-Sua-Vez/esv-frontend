import { login, register, logout, invited } from '../firebase';
import { getCollaboratorByEmail, getCollaboratorByEmailNotToken, registerCollaboratorToken, changeCollaboratorPassword } from './collaborator';
import { getAdministratorByEmail, getAdministratorByEmailNotToken, getMasterAdministratorByEmail, registerAdministratorToken, changeAdministratorPassword } from './administrator';
import { getRolByName } from './rol';

export const signIn = async (email, password, userType) => {
    const token = await login(email.trim(), password.trim());
    if (token.includes('Usuario no registrado o password inválida')) {
      return 'error';
    } else {
      let user = undefined;
      if (userType === 'collaborator') {
        user = await getCollaboratorByEmail(email);
        if (user) {
          user = await registerCollaboratorToken(user.id, { token: token });
        }
      } else if (userType === 'business') {
        user = await getAdministratorByEmail(email);
        if (user) {
          user = await registerAdministratorToken(user.id, { token: token });
        }
      } else if (userType === 'master') {
        user = await getMasterAdministratorByEmail(email);
        if (user) {
          user = await registerAdministratorToken(user.id, { token: token });
        }
      }
      if (!user.active || user.active === false || user.active === 'false') {
        return 'inactive';
      }
      if (user === undefined) {
        return 'error';
      }
      return { user, token: token };
    }
}

export const signOut = async (email, userType) => {
  if (userType === 'collaborator') {
    if (email) {
      const user = await getCollaboratorByEmail(email);
      await registerCollaboratorToken(user.id, { token: '' });
    }
    await logout();
  } else if (userType === 'business') {
    if (email) {
      const user = await getAdministratorByEmail(email);
      await registerAdministratorToken(user.id, { token: '' });
    }
    await logout();
  } else if (userType === 'master') {
    if (email) {
      const user = await getMasterAdministratorByEmail(email);
      await registerAdministratorToken(user.id, { token: '' });
    }
    await logout();
  } else if (userType === 'invited') {
    await logout();
  }
}

export const signUp = async (email, password) => {
  return register(email, password);
}

export const signInInvited = async () => {
  const token = await invited();
  if (token === 'Usuario invitado no pudo ser logeado') {
    return 'error';
  } else {
    await getRolByName('invited');
    const user = {
      name: 'invitado',
      active: true,
      token,
      time: new Date()
    }
    return user;
  }
}

export const changePassword = async (email, userType) => {
  let user = undefined;
  if (userType === 'collaborator') {
    user = await getCollaboratorByEmailNotToken(email);
    user = await changeCollaboratorPassword(user.id);
  } else if (userType === 'business') {
    user = await getAdministratorByEmailNotToken(email);
    user = await changeAdministratorPassword(user.id);
  } else if (userType === 'master') {
    return new Error('Action not permited to this user');
  }
  if (user === undefined) {
    return new Error('Type of user not detected');
  }
  return { user };
}
