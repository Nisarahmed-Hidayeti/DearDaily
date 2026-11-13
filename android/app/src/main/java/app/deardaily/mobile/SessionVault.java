package app.deardaily.mobile;

import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SessionVault")
public class SessionVault extends Plugin {
    private static final String ALIAS = "deardaily-auth-v1";

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(ALIAS, 0);
    }

    private synchronized SecretKey secret() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        SecretKey key = (SecretKey) store.getKey(ALIAS, null);
        if (key != null) return key;
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(
            ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .build());
        return generator.generateKey();
    }

    private Cipher cipher() throws Exception {
        return Cipher.getInstance("AES/GCM/NoPadding");
    }

    private String key(PluginCall call) {
        String key = call.getString("key", "");
        if (!key.matches("sb-[a-z0-9-]+-auth-token(?:-[a-z0-9-]+)?")) {
            throw new IllegalArgumentException();
        }
        return key;
    }

    @PluginMethod
    public void read(PluginCall call) {
        try {
            String key = key(call);
            String saved = preferences().getString(key, null);
            JSObject result = new JSObject();
            if (saved != null) {
                String[] parts = saved.split(":", 2);
                Cipher cipher = cipher();
                cipher.init(Cipher.DECRYPT_MODE, secret(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
                cipher.updateAAD(key.getBytes(StandardCharsets.UTF_8));
                result.put("value", new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8));
            }
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Secure session unavailable");
        }
    }

    @PluginMethod
    public void write(PluginCall call) {
        try {
            String key = key(call);
            String value = call.getString("value");
            if (value == null) throw new IllegalArgumentException();
            Cipher cipher = cipher();
            cipher.init(Cipher.ENCRYPT_MODE, secret());
            cipher.updateAAD(key.getBytes(StandardCharsets.UTF_8));
            String saved = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":" +
                Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            if (!preferences().edit().putString(key, saved).commit()) throw new IllegalStateException();
            call.resolve();
        } catch (Exception error) {
            call.reject("Secure session unavailable");
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        try {
            if (!preferences().edit().remove(key(call)).commit()) throw new IllegalStateException();
            call.resolve();
        } catch (Exception error) {
            call.reject("Secure session unavailable");
        }
    }
}
