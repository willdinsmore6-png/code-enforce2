import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const townId = user.data?.town_id || user.town_id;
    
    // Try to read all TownConfigs
    const configs = await base44.entities.TownConfig.list();

    return Response.json({ 
      user_email: user.email,
      user_town_id: townId,
      town_configs_accessible: configs && configs.length > 0,
      town_configs: configs || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});