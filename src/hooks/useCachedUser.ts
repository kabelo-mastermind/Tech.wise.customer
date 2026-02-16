import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../redux/actions/authActions';
import { getStoredUser } from '../utils/storage';

const useCachedUser = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.auth.user);

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      if (!user) {
        const cached = await getStoredUser();
        if (mounted && cached) dispatch(setUser(cached));
      }
    };
    hydrate();
    return () => { mounted = false };
  }, [user, dispatch]);

  return { user };
};

export default useCachedUser;
