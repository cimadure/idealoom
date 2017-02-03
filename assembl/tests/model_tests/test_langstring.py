import pytest
from assembl.lib.locale import create_mt_code

def test_empty_user_language_preference_en_cookie(
        langstring_body, fr_from_en_langstring_entry,
        test_adminuser_webrequest):
    """
    Body: en, fr-x-mtfrom-en
    User Language Preferences: None
    Request: _LOCALE_: 'en'
    Expect: en
    """

    # A pyramid application uses a locale negotiator that looks for
    # _LOCALE_ in either params or cookies in order to determine the
    # session locale.
    # http://docs.pylonsproject.org/projects/pyramid/en/latest/narr/i18n.html
    test_adminuser_webrequest.cookies["_LOCALE_"] = "en"

    user_language_preference = None
    best = langstring_body.best_lang(
        user_prefs=user_language_preference, allow_errors=True)

    assert best.locale_code == 'en'


@pytest.mark.xfail
def test_empty_user_language_preference_fr_cookie(
        langstring_body, fr_from_en_langstring_entry,
        test_adminuser_webrequest):
    """
    Body: en, fr-x-mtfrom-en
    User Language Preferences: None
    Request: _LOCALE_: 'fr'
    Expect: fr-x-mtfrom-en
    """

    # A pyramid application uses a locale negotiator that looks for
    # _LOCALE_ in either params or cookies in order to determine the
    # session locale.
    # http://docs.pylonsproject.org/projects/pyramid/en/latest/narr/i18n.html
    test_adminuser_webrequest.cookies["_LOCALE_"] = "fr"

    user_language_preference = None
    best = langstring_body.best_lang(
        user_prefs=user_language_preference, allow_errors=True)

    assert best.locale_code == create_mt_code('en', 'fr')


@pytest.mark.xfail
def test_empty_user_language_preference_fr_CA_cookie(
        langstring_body, fr_from_en_langstring_entry,
        test_adminuser_webrequest):
    """
    Body: en, fr-x-mtfrom-en
    User Language Preferences: None
    Request: _LOCALE_: 'fr_CA'
    Expect: fr-x-mtfrom-en
    """

    # A pyramid application uses a locale negotiator that looks for
    # _LOCALE_ in either params or cookies in order to determine the
    # session locale.
    # http://docs.pylonsproject.org/projects/pyramid/en/latest/narr/i18n.html
    test_adminuser_webrequest.cookies["_LOCALE_"] = "fr_CA"

    user_language_preference = None
    best = langstring_body.best_lang(
        user_prefs=user_language_preference, allow_errors=True)

    assert best.locale_code == create_mt_code('en', 'fr')


def test_user_language_preference_en_cookie(
        user_language_preference_en_cookie, admin_user,
        fr_from_en_langstring_entry, langstring_body,
        test_adminuser_webrequest):
    """
    Body: en, fr-x-mtfrom-en
    User Language Preferences: {en: cookie}
    Expect: en
    """
    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == 'en'


def test_user_language_preference_fr_cookie(
        user_language_preference_fr_cookie, admin_user,
        fr_from_en_langstring_entry, langstring_body,
        test_adminuser_webrequest):
    """
    Body: en, fr-x-mtfrom-en
    User Language Preferences: {fr: cookie}
    Expect: fr-x-mtfrom-en
    """
    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('en', 'fr')


def test_user_language_preference_fr_to_en_explicit(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_fr_cookie,
        user_language_preference_en_mtfrom_fr,
        user_language_preference_en_explicit,
        fr_from_en_langstring_entry):
    # user_language_preference_en_cookie,
    """
    Body: en, fr-x-mtfrom-en
    User Language Preference: {fr-to-en: explicit; en: explicit; en: cookie}
    Expect: en
    """
    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == 'en'


def test_user_language_preference_en_to_fr_explicit(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_fr_cookie,
        user_language_preference_fr_mtfrom_en,
        user_language_preference_fr_explicit,
        fr_from_en_langstring_entry):
    """
    Body: en, fr-x-mtfrom-en
    User Language Preference: {en-to-fr: explicit; fr: explicit; en: cookie}
    Expect: fr-x-mtfrom-en
    """
    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('en', 'fr')


def test_user_language_preference_fr_to_en_explicit_missing_en_explicit(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_fr_cookie,
        user_language_preference_en_mtfrom_fr,
        fr_from_en_langstring_entry):
    """
    Body: en, fr-x-mtfrom-en
    User Language Preference: {en-to-fr: explicit; fr: explicit; en: cookie}
    Expect: fr-x-mtfrom-en
    """
    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == 'en'


def test_user_language_preference_en_to_fr_explicit_missing_fr_explicit(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_fr_cookie,
        user_language_preference_fr_mtfrom_en,
        fr_from_en_langstring_entry):
    """
    Body: en, fr-x-mtfrom-en
    User Language Preference: {en-to-fr: explicit; fr: explicit; en: cookie}
    Expect: fr-x-mtfrom-en
    """
    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('en', 'fr')


def test_user_language_preference_en_to_fr_explicit_and_fr_explicit(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_en_cookie,
        user_language_preference_fr_mtfrom_en,
        test_session):
    """
    User Language Preference: {en: cookie; en-to-fr: Explicit}
    Add {fr: Explicit} to User Language Preference
    Expect: IntegrityError
    """
    from pyodbc import IntegrityError
    from assembl.models.auth import (
        LanguagePreferenceOrder,
        UserLanguagePreference
    )

    ulp = UserLanguagePreference(
        user=admin_user,
        locale='fr',
        preferred_order=0,
        source_of_evidence=LanguagePreferenceOrder.Explicit.value)

    test_session.add(ulp)
    test_session.flush()

    pytest.raises(IntegrityError)


def test_user_language_preference_en_to_fr_explicit_fr_to_it_explicit(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_en_cookie,
        user_language_preference_fr_mtfrom_en,
        user_language_preference_it_mtfrom_fr,
        en_langstring_entry,
        fr_from_en_langstring_entry,
        it_from_en_langstring_entry):
    """
    Body: en, fr-x-mtfrom-en, it-x-mtfrom-en
    User Language Preference: {en: cookie; en-to-fr: explicit;
                               fr-to-it: explicit}
    Expect: fr-x-mtfrom-en
    """

    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('en', 'fr')


def test_user_language_preference_fr_explicit_en_cookie_en_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_en_cookie,
        user_language_preference_fr_explicit,
        en_langstring_entry, it_from_en_langstring_entry,
        fr_from_en_langstring_entry):
    """
    Body: en, it-x-mtfrom-en, fr-x-mtfrom-en
    User Language Peference: {fr: explicit; en: cookie}
    Comment: {en: cookie} is a fallback
    Expect: en
    """
    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == 'en'


def test_user_language_preference_fr_explicit_en_cookie_fr_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_en_cookie,
        user_language_preference_fr_explicit,
        fr_langstring_entry, en_from_fr_langstring_entry,
        it_from_fr_langstring_entry):
    """
    Body: fr, en-x-mtfrom-fr, it-x-mtfrom-fr
    User Language Peference: {fr: explicit; en: cookie}
    Comment: {en: cookie} is a fallback
    Expect: fr
    """
    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == 'fr'


def test_user_language_preference_en_to_fr_explicit_en_cookie_fr_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_en_cookie,
        user_language_preference_fr_mtfrom_en,
        en_langstring_entry, fr_from_en_langstring_entry):
    """
    Body: en, fr-x-mtfrom-en
    User Language Preference: {en: cookie; en-to-fr: explicit}
    Expect: fr-x-mtfrom-en
    """
    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('en', 'fr')


def test_user_language_preferences_it_explicit_en_cookie_fr_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_en_cookie,
        user_language_preference_it_explicit,
        fr_langstring_entry, it_from_fr_langstring_entry,
        en_from_fr_langstring_entry):
    """
    Body: fr, it-x-mtfrom-fr, en-x-mtfrom-fr
    User Language Preferences: {en: cookie; it: explicit}
    Expect: it-x-mtfrom-fr
    """
    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('fr', 'it')


def test_user_language_preferences_fr_to_it_explicit_en_cookie_fr_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_en_cookie,
        user_language_preference_it_mtfrom_en,
        fr_langstring_entry, it_from_fr_langstring_entry,
        en_from_fr_langstring_entry):
    """
    Body: fr, it-x-mtfrom-fr, en-x-mtfrom-fr
    User Language Preferences: {en: cookie; en-to-it: explicit}
    Expect: it-x-mtfrom-fr
    """
    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('fr', 'it')


def test_user_language_preference_fr_cookie_en_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_fr_cookie,
        fr_from_en_langstring_entry):
    """
    Body: en
    User Language Preference: {fr: cookie}
    Expect: en
    """

    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('en', 'fr')


def test_user_language_preference_fr_cookie_fr_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_fr_cookie,
        fr_langstring_entry):
    """
    Body: fr
    User Language Preference: {fr: cookie}
    Expect: fr
    """
    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == 'fr'


def test_user_language_preference_fr_from_en_it_from_fr_en_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_fr_mtfrom_en,
        user_language_preference_it_mtfrom_fr,
        fr_from_en_langstring_entry,
        langstring_entry_values,
        test_session):
    """
    Body: en, fr-x-mtfrom-en, it-x-mtfrom-fr
    User Language Preference: {en-to-fr: explicit, fr-to-it}
    Expect: fr-x-mtfrom-en
    """
    from assembl.models.langstrings import LangStringEntry

    entry = LangStringEntry(
        locale_confirmed=False,
        langstring=langstring_body,
        locale='it',
        mt_trans_of=fr_from_en_langstring_entry,
        value=langstring_entry_values.get('body').get('italian')
    )

    test_session.expire(langstring_body, ["entries"])

    test_session.add(entry)
    test_session.commit()

    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('en', 'fr')


def test_user_language_preference_fr_from_en_it_from_fr_fr_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_fr_mtfrom_en,
        user_language_preference_it_mtfrom_fr,
        it_from_fr_langstring_entry,
        langstring_entry_values,
        fr_langstring_entry,
        test_session):
    """
    Body: fr, it-x-mtfrom-fr, en-x-mtfrom-fr
    User Language Preference: {en-to-fr: explicit, fr-to-it}
    Expect: fr-x-mtfrom-en
    """
    from assembl.models.langstrings import LangStringEntry

    entry = LangStringEntry(
        locale_confirmed=False,
        langstring=langstring_body,
        locale='en',
        mt_trans_of=fr_langstring_entry,
        value=langstring_entry_values.get('body').get('english')
    )

    test_session.expire(langstring_body, ["entries"])

    test_session.add(entry)
    test_session.commit()

    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('fr', 'it')


def test_user_language_preference_fr_from_en_it_from_fr_it_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_fr_mtfrom_en,
        user_language_preference_it_mtfrom_fr,
        en_from_it_langstring_entry,
        langstring_entry_values,
        it_langstring_entry,
        test_session):
    """
    Body: fr, it-x-mtfrom-fr, en-x-mtfrom-fr
    User Language Preference: {en-to-fr: explicit, fr-to-it}
    Expect: fr-x-mtfrom-en
    """
    from assembl.models.langstrings import LangStringEntry

    entry = LangStringEntry(
        locale_confirmed=False,
        langstring=langstring_body,
        locale='fr',
        mt_trans_of=it_langstring_entry,
        value=langstring_entry_values.get('body').get('french')
    )

    test_session.expire(langstring_body, ["entries"])

    test_session.add(entry)
    test_session.commit()

    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == 'it'


def test_user_language_preference_it_explicit_fr_explicit_en_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_it_explicit,
        user_language_preference_fr_explicit,
        fr_from_en_langstring_entry,
        it_from_en_langstring_entry,
        test_session):
    """
    Body: en, fr-x-mtfrom-en, it-x-mtfrom-en
    User Language Preference: {it: explicit, priority: 0;
                               fr: explicit, priority: 1}
    Expect: it-x-mtfrom-en
    """
    lang_prefs = admin_user.language_preference

    fr_pref = [a for a in lang_prefs
               if a.user == admin_user and
               a.locale == 'fr'][0]

    fr_pref.preferred_order = 1
    test_session.flush()

    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('en', 'it')


def test_user_language_preference_it_from_fr_en_from_de_tr_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_it_mtfrom_fr,
        user_language_preference_en_mtfrom_de,
        en_from_tr_langstring_entry,
        de_from_tr_langstring_entry,
        test_session):
    """
    Body: tr, en-x-mtfrom-tr, de-x-mtfrom-tr
    User Language Preference: {fr-to-it: explicit, priority: 1,
                               de-to-en: explicit, priority: 0}
    Expect: en-x-mtfrom-tr
    """

    lang_prefs = admin_user.language_preference

    it_from_fr_pref = [a for a in lang_prefs
                       if a.user == admin_user and
                       a.locale == 'fr' and
                       a.translate == 'it'][0]

    it_from_fr_pref.preferred_order = 1

    test_session.flush()

    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('tr', 'en')


def test_user_language_preference_locale_non_linguistic(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_en_cookie,
        user_language_preference_fr_mtfrom_en,
        non_linguistic_langstring_entry):
    """
    Body: non-linguistic,
    User Language Preference: {en: cookie; en-to-fr: explicit}
    Expect: non-linguistic
    """
    from assembl.models import LocaleLabel

    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == LocaleLabel.NON_LINGUISTIC


# Is this true?? @TODO: Check with MAP
def test_user_language_preference_locale_undefined_fr_from_und(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_en_cookie,
        user_language_preference_fr_mtfrom_en,
        fr_from_und_langstring_entry):
    """
    Body: und, fr-x-mtfrom-und
    User Language Preference: {en: cookie; en-to-fr: explicit}
    Expect: fr-x-mtfrom-und
    """

    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('und', 'fr')


def test_user_language_preference_en_from_fr_fr_from_en_en_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_fr_mtfrom_en,
        user_language_preference_en_mtfrom_fr,
        fr_from_en_langstring_entry):
    """
    Body: en, fr-x-mtfrom-en
    User Language Preference: {en-to-fr: explicit; fr-to-en: explicit}
    Expect: fr-x-mtfrom-en
    """

    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('en', 'fr')


def test_user_language_preference_en_from_fr_fr_from_en_fr_entry(
        admin_user, langstring_body, test_adminuser_webrequest,
        user_language_preference_fr_mtfrom_en,
        user_language_preference_en_mtfrom_fr,
        en_from_fr_langstring_entry):
    """
    Body: fr, en-x-mtfrom-fr
    User Language Preference: {en-to-fr: explicit; fr-to-en: explicit}
    Expect: en-x-mtfrom-fr
    """

    lang_prefs = admin_user.language_preference
    best = langstring_body.best_lang(user_prefs=lang_prefs, allow_errors=True)

    assert best.locale_code == create_mt_code('fr', 'en')
