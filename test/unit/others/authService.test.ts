import jwt             from 'jsonwebtoken';
import { processToken } from '@services/authService';
import { UserType }    from '@models/UserType';
import { UserRepository } from '@repositories/UserRepository';
import { UnauthorizedError } from '@models/errors/UnauthorizedError';

jest.mock('jsonwebtoken');
jest.mock('@repositories/UserRepository');

// dato fittizio
const userDTO = { username: 'ghost', type: UserType.Viewer };

// shortcut
const Bearer = (t: string) => `Bearer ${t}`;

describe('authService – rami UnauthorizedError scoperti', () => {

  
  it('processToken → Unauthorized se l’utente non esiste più', async () => {
    (jwt.verify as jest.Mock).mockReturnValue(userDTO);         // token valido
   
    (UserRepository as jest.Mock).mockImplementation(() => ({
      getUserByUsername: jest.fn().mockRejectedValue(new Error('not found'))
    }));

    await expect(
      processToken(Bearer('valid'), [])       
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  
  it('processToken → Unauthorized se il token è corrotto', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    await expect(
      processToken(Bearer('badtoken'), [])
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  
  it('processToken → Unauthorized se l’header manca', async () => {
    await expect(
      processToken(undefined, [])
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  
  it('processToken → Unauthorized se il formato Bearer è errato', async () => {
    await expect(
      processToken('Token abcdef', [])           // manca “Bearer ”
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it ('chiamata next error se process token lancia errore con userType[] = []', async () => {
    await expect(
      processToken('Bearer validtoken')       // nessun ruolo specificato
    ).rejects.toThrow();
  });
});
